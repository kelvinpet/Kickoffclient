import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      return new Response("Payment not configured", { status: 500 });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const verifyData = await verifyRes.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (verifyData.data?.status === "success") {
      const submissionId = verifyData.data.metadata?.submission_id;

      // Update transaction status
      await supabase.from("paystack_transactions")
        .update({ status: "success" } as any)
        .eq("paystack_reference", reference);

      // Update submission
      if (submissionId) {
        await supabase.from("submissions")
          .update({
            status: "deposit_paid",
            deposit_paid_at: new Date().toISOString(),
          } as any)
          .eq("id", submissionId);
      }

      // Redirect back to portal
      const portalToken = submissionId
        ? (await supabase.from("submissions").select("portal_token").eq("id", submissionId).single()).data?.portal_token
        : null;

      const redirectUrl = portalToken
        ? `${url.origin.replace('functions/v1', '').replace(/\/$/, '')}/portal/${portalToken}`
        : url.origin;

      // Redirect to the frontend app
      return new Response(null, {
        status: 302,
        headers: {
          Location: `https://${Deno.env.get("SUPABASE_URL")?.replace("https://", "").replace(".supabase.co", "")}-preview.lovable.app/portal/${portalToken || ""}`,
        },
      });
    } else {
      await supabase.from("paystack_transactions")
        .update({ status: "failed" } as any)
        .eq("paystack_reference", reference);

      return new Response("Payment verification failed", { status: 400 });
    }
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
