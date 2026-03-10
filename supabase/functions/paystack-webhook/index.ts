import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyPaystackSignature(body: string, signature: string, secretKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === signature;
}

async function findWorkspaceId(serviceClient: any, metadata: any, reference?: string): Promise<string | null> {
  if (metadata?.workspace_id) return metadata.workspace_id;
  if (reference) {
    const { data } = await serviceClient
      .from("paystack_transactions")
      .select("workspace_id")
      .eq("paystack_reference", reference)
      .single();
    if (data?.workspace_id) return data.workspace_id;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";
    const event = JSON.parse(body);
    const metadata = event.data?.metadata || {};
    const reference = event.data?.reference;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Read Paystack secret key from server-side secrets for signature verification
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured in server secrets");
      return new Response(JSON.stringify({ error: "Paystack server key not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Verify signature
    const valid = await verifyPaystackSignature(body, signature, paystackSecretKey);
    if (!valid) {
      console.error("Invalid Paystack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const workspaceId = await findWorkspaceId(serviceClient, metadata, reference);

    if (!workspaceId) {
      console.error("No workspace_id found in metadata or reference mapping", { metadata, reference });
      return new Response(JSON.stringify({ error: "No workspace_id found" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const eventType = event.event;
    const data = event.data || {};
    console.log("Paystack webhook event:", eventType, "workspace:", workspaceId);

    if (
      eventType === "subscription.create" ||
      eventType === "charge.success" ||
      eventType === "invoice.payment_success" ||
      eventType === "invoice.payment_succeeded"
    ) {
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
            paystack_customer_code: data.customer?.customer_code || null,
            paystack_subscription_code: data.subscription_code || null,
            paystack_email_token: data.email_token || null,
            paystack_plan_code: data.plan?.plan_code || null,
            next_payment_date: data.next_payment_date || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );

      if (reference) {
        await serviceClient
          .from("paystack_transactions")
          .update({ status: "processed" })
          .eq("paystack_reference", reference);
      }
    } else if (
      eventType === "subscription.disable" ||
      eventType === "subscription.not_renew" ||
      eventType === "charge.failed" ||
      eventType === "invoice.payment_failed"
    ) {
      await serviceClient
        .from("workspaces")
        .update({ plan: "free", monthly_submission_limit: 2 })
        .eq("id", workspaceId);

      await serviceClient
        .from("subscriptions")
        .upsert(
          {
            workspace_id: workspaceId,
            provider: "paystack",
            plan: "free",
            status: eventType.includes("disable") ? "canceled" : "inactive",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
