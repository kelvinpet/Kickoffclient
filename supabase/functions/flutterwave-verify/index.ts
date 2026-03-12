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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tx_ref, transaction_id } = await req.json();
    if (!tx_ref && !transaction_id) {
      return new Response(JSON.stringify({ error: "Missing identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // choose verify endpoint
    let verifyUrl = "";
    if (transaction_id) {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    } else {
      // verify by reference
      verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`;
    }

    const fwRes = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });
    const fwData = await fwRes.json();

    if (!fwRes.ok) {
      console.error("flutterwave verify error", fwRes.status, fwData);
      return new Response(JSON.stringify({ error: fwData.message || "Verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = fwData.data?.status;
    const email = fwData.data?.customer?.email;
    const txRef = fwData.data?.tx_ref || null;
    const transactionId = fwData.data?.id;
    const planUsed = fwData.data?.plan || fwData.data?.plan_id || null;
    const metadata: any = fwData.data?.meta || {};

    console.log("flutterwave verify result", {
      status,
      txRef,
      transactionId,
      planUsed,
      metadata,
    });

    // we'll insert a payment record later once the Supabase client is available

    if (status !== "successful") {
      return new Response(JSON.stringify({ success: false, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceRoleKey);

    // avoid processing the same payment twice
    if (txRef) {
      const { data: existing } = await service
        .from("payments")
        .select("id")
        .eq("tx_ref", txRef)
        .single();
      if (existing?.id) {
        console.log("duplicate payment reference, skipping all updates", txRef);
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // record the transaction regardless of status for debugging
    try {
      await service.from("payments").insert({
        user_id: metadata.user_id || null,
        email,
        amount: fwData.data?.amount,
        currency: fwData.data?.currency || "USD",
        status,
        tx_ref: txRef,
        transaction_id: transactionId,
        payment_method: fwData.data?.payment_type || fwData.data?.payment_method || null,
        plan: planUsed,
      });
    } catch (err:any) {
      console.error("failed to insert payment record", err);
    }

    // helper to update profile fields
    const upgradeProfile = async (identifier: { email?: string }) => {
      if (identifier.email) {
        await service
          .from("profiles")
          .update({
            plan: "pro",
            subscription_status: "active",
            subscription_started_at: new Date().toISOString(),
          })
          .eq("email", identifier.email);
      }
    };

    // determine workspace ID using metadata first, then txRef, then email lookup
    let workspaceId: string | null = metadata.workspace_id || null;
    let profileId: string | null = null;

    if (!workspaceId && txRef && txRef.startsWith("kickoff-")) {
      const parts = txRef.split("-");
      if (parts.length >= 3) {
        workspaceId = parts[1];
      }
    }

    if (!workspaceId && email) {
      // fall back to lookup based on profile email
      const { data: profile } = await service
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      if (profile?.id) {
        profileId = profile.id;
        const { data: ws } = await service
          .from("workspaces")
          .select("id")
          .eq("owner_user_id", profile.id)
          .single();
        if (ws?.id) {
          workspaceId = ws.id;
        }
      }
    }

    // perform updates if we have a workspace
    if (workspaceId) {
      // set workspace plan
      await service
        .from("workspaces")
        .update({ plan: "pro" })
        .eq("id", workspaceId);

      // renewal logic: fetch existing subscription
      const { data: existingSub } = await service
        .from("subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .single();

      const now = new Date();
      const periodMs = 30 * 24 * 60 * 60 * 1000; // 1 month
      let current_period_start = now.toISOString();
      let current_period_end = new Date(now.getTime() + periodMs).toISOString();
      let expiresAt = current_period_end;
      let renewedAt: string | null = null;
      let billing_cycle = "monthly";
      let amount = fwData.data?.amount || 0;
      let currency = fwData.data?.currency || "USD";

      if (existingSub && existingSub.id) {
        // compute new period end based on greatest(now, existing end)
        const oldEnd = existingSub.current_period_end
          ? new Date(existingSub.current_period_end)
          : now;
        const base = oldEnd > now ? oldEnd : now;
        current_period_end = new Date(base.getTime() + periodMs).toISOString();
        expiresAt = current_period_end;
        renewedAt = now.toISOString();
        current_period_start = existingSub.current_period_start || current_period_start;
        billing_cycle = existingSub.billing_cycle || billing_cycle;
        amount = existingSub.amount || amount;
        currency = existingSub.currency || currency;
      }

      // upsert subscription record with new/renewed values
      await service
        .from("subscriptions")
        .upsert({
          workspace_id: workspaceId,
          user_id: profileId,
          provider: "flutterwave",
          plan: "pro",
          status: "active",
          billing_cycle,
          amount,
          currency,
          current_period_start,
          current_period_end,
          expires_at: expiresAt,
          renewed_at: renewedAt,
          tx_ref: txRef,
          transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
    }

    // also update the profile if we have an email
    if (email) {
      await upgradeProfile({ email });
    }

    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});