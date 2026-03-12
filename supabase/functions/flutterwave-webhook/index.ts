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

    const event = await req.json();

    // Flutterwave sends event and data fields
    const type = event.event;
    const data = event.data || {};
    const status = data.status;

    // prepare Supabase client (service role) for any updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceRoleKey);

    // handle successful charges first. other events like failed payments
    // should mark the subscription past_due.
    if (type === "charge.completed" && status === "successful") {
      // continue below
    } else {
      // mark past due for any failed/other outcome
      if (status && (type === "charge.completed" || type === "charge.failed")) {
        // attempt to update subscription status to past_due if we can locate it
        const email = data.customer?.email;
        if (email) {
          const { data: profile } = await service
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();
          if (profile?.id) {
            const { data: workspace } = await service
              .from("workspaces")
              .select("id")
              .eq("owner_user_id", profile.id)
              .single();
            if (workspace?.id) {
              await service
                .from("subscriptions")
                .update({ status: "past_due" })
                .eq("workspace_id", workspace.id);
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = data.customer?.email;
    const transactionId = data.id;
    const txRef = data.tx_ref || null;
    const amount = data.amount;
    const planUsed = data.plan || data.plan_id || null;

    console.log("flutterwave webhook event", { type, status, email, transactionId, txRef, planUsed });

    // duplicate guard
    if (txRef) {
      const { data: existingPayment } = await service
        .from("payments")
        .select("id")
        .eq("tx_ref", txRef)
        .single();
      if (existingPayment?.id) {
        console.log("duplicate webhook payment", txRef);
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: any = {
      plan: "pro",
      subscription_status: "active",
      subscription_started_at: new Date().toISOString(),
    };

    await service
      .from("profiles")
      .update(updates)
      .eq("email", email);

    // ensure workspace and subscription rows are also updated
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    if (profile?.id) {
      // update workspace plan
      const { data: workspace } = await service
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", profile.id)
        .single();
      if (workspace?.id) {
        await service
          .from("workspaces")
          .update({ plan: "pro" })
          .eq("id", workspace.id);

        // renewal logic
        const { data: existingSub } = await service
          .from("subscriptions")
          .select("*")
          .eq("workspace_id", workspace.id)
          .single();
        const now = new Date();
        const periodMs = 30 * 24 * 60 * 60 * 1000; // one month
        let current_period_start = now.toISOString();
        let current_period_end = new Date(now.getTime() + periodMs).toISOString();
        let expiresAt = current_period_end;
        let renewedAt: string | null = null;
        let billing_cycle = "monthly";
        let amountField = amount;
        let currency = data.currency || "USD";

        if (existingSub && existingSub.id) {
          const oldEnd = existingSub.current_period_end
            ? new Date(existingSub.current_period_end)
            : now;
          const base = oldEnd > now ? oldEnd : now;
          current_period_end = new Date(base.getTime() + periodMs).toISOString();
          expiresAt = current_period_end;
          renewedAt = now.toISOString();
          current_period_start = existingSub.current_period_start || current_period_start;
          billing_cycle = existingSub.billing_cycle || billing_cycle;
          amountField = existingSub.amount || amountField;
          currency = existingSub.currency || currency;
        }

        // upsert subscription record
        await service
          .from("subscriptions")
          .upsert({
            workspace_id: workspace.id,
            user_id: profile.id,
            provider: "flutterwave",
            plan: "pro",
            status: "active",
            billing_cycle,
            amount: amountField,
            currency,
            current_period_start,
            current_period_end,
            expires_at: expiresAt,
            renewed_at: renewedAt,
            tx_ref: txRef,
            transaction_id: transactionId,
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspace.id);

        // record the payment event for debugging
        try {
          await service.from("payments").insert({
            user_id: profile.id,
            email,
            amount,
            currency: data.currency || "USD",
            status,
            tx_ref: txRef,
            transaction_id: transactionId,
            payment_method: data.payment_type || data.payment_method || null,
            plan: planUsed,
          });
        } catch (err:any) {
          console.error("failed to insert payment record", err);
        }
      }
    }

    // Optionally log or store transaction info
    console.log("flutterwave webhook handled", { email, transactionId, amount });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});