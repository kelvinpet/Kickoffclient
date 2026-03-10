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
    const { reference } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find workspace from transaction mapping
    const { data: txn } = await serviceClient
      .from("paystack_transactions")
      .select("workspace_id, status")
      .eq("paystack_reference", reference)
      .single();

    if (!txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: corsHeaders });
    }

    // Already processed
    if (txn.status === "processed") {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = txn.workspace_id;

    // Verify workspace ownership
    const { data: workspace } = await serviceClient
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_user_id", userId)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404, headers: corsHeaders });
    }

    // Read Paystack secret key from server-side secrets
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack server key not configured. Add PAYSTACK_SECRET_KEY in server secrets." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Paystack Verify Transaction API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const verifyData = await verifyRes.json();
    console.log("Paystack verify response:", JSON.stringify(verifyData));

    if (!verifyData.status || verifyData.data?.status !== "success") {
      await serviceClient
        .from("paystack_transactions")
        .update({ status: "failed" })
        .eq("paystack_reference", reference);

      return new Response(JSON.stringify({ error: "Payment not successful", paystack_status: verifyData.data?.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment verified! Activate Pro
    const paystackData = verifyData.data;

    await serviceClient
      .from("workspaces")
      .update({ plan: "pro", monthly_submission_limit: 999999 })
      .eq("id", workspaceId);

    await serviceClient
      .from("subscriptions")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: "paystack",
          plan: "pro",
          status: "active",
          paystack_customer_code: paystackData.customer?.customer_code || null,
          paystack_subscription_code: paystackData.plan_object?.subscription_code || null,
          paystack_plan_code: paystackData.plan_object?.plan_code || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

    // Mark transaction as processed
    await serviceClient
      .from("paystack_transactions")
      .update({ status: "processed" })
      .eq("paystack_reference", reference);

    return new Response(JSON.stringify({ success: true, plan: "pro" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Verify error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
