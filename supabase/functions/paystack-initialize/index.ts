import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;
    const { workspace_id } = await req.json();

    // Get workspace with service role
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: workspace } = await serviceClient
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .eq("owner_user_id", userId)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404, headers: corsHeaders });
    }

    // Read Paystack secret key from server-side secrets (NOT from workspace_secrets)
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack server key not configured. Add PAYSTACK_SECRET_KEY in server secrets." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const planCode = Deno.env.get("PAYSTACK_PLAN_CODE");
    if (!planCode) {
      return new Response(
        JSON.stringify({ error: "Paystack plan code not configured. Add PAYSTACK_PLAN_CODE in server secrets." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user email
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const email = profile?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing customer email" }), { status: 400, headers: corsHeaders });
    }

    const callbackUrl = `${req.headers.get("origin") || supabaseUrl}/app/billing?paystack=1`;

    const payload = {
      email,
      amount: 10000,
      plan: planCode,
      callback_url: callbackUrl,
      metadata: {
        workspace_id,
        user_id: userId,
      },
    };

    console.log("Paystack initialize payload:", JSON.stringify({ ...payload, plan: planCode }));

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const paystackData = await paystackRes.json();
    console.log("Paystack response status:", paystackRes.status, "body:", JSON.stringify(paystackData));

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const paystackReference = paystackData.data.reference;

    // Store pending transaction for reference→workspace mapping
    await serviceClient
      .from("paystack_transactions")
      .insert({
        workspace_id,
        paystack_reference: paystackReference,
        status: "pending",
      });

    return new Response(
      JSON.stringify({ authorization_url: paystackData.data.authorization_url, reference: paystackReference }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
