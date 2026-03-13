// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getNextPaymentDateISO() {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now.toISOString();
}

async function activateSubscription(
  service: ReturnType<typeof createClient>,
  workspaceId: string
) {
  const nextPaymentDate = getNextPaymentDateISO();

  const subscriptionPayload = {
    workspace_id: workspaceId,
    provider: "flutterwave",
    plan: "pro",
    status: "active",
    next_payment_date: nextPaymentDate,
    current_period_end: nextPaymentDate,
    expires_at: nextPaymentDate, // prevent downgrade in useSubscription
    updated_at: new Date().toISOString(),
  };

  console.log("webhook subscription upsert payload", subscriptionPayload);

  const { error } = await service
    .from("subscriptions")
    .upsert(subscriptionPayload, { onConflict: "workspace_id" });

  if (error) {
    console.error("webhook subscription upsert failed", error, subscriptionPayload);
    throw new Error(`Subscription upsert failed: ${error.message}`);
  }
}

async function markPastDue(
  service: ReturnType<typeof createClient>,
  workspaceId: string
) {
  const { error } = await service
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("webhook markPastDue failed", error, { workspaceId });
  }
}

async function updateProfileIfPossible(
  service: ReturnType<typeof createClient>,
  email?: string | null,
  userId?: string | null,
  status: "active" | "past_due" = "active"
) {
  const updates =
    status === "active"
      ? {
          subscription_status: "active",
          subscription_started_at: new Date().toISOString(),
        }
      : {
          subscription_status: "past_due",
        };

  if (userId) {
    const { error } = await service
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("webhook profile update by id failed", error, { userId, status });
    }
    return;
  }

  if (email) {
    const { error } = await service
      .from("profiles")
      .update(updates)
      .eq("email", email);

    if (error) {
      console.error("webhook profile update by email failed", error, {
        email,
        status,
      });
    }
  }
}

async function insertPaymentIfMissing(
  service: ReturnType<typeof createClient>,
  paymentData: Record<string, any>
) {
  const txRef = paymentData.tx_ref ?? null;
  const transactionId = paymentData.transaction_id ?? null;

  const orClauses: string[] = [];
  if (txRef) orClauses.push(`tx_ref.eq.${txRef}`);
  if (transactionId) orClauses.push(`transaction_id.eq.${transactionId}`);

  if (orClauses.length > 0) {
    const { data: existing, error: existingError } = await service
      .from("payments")
      .select("id")
      .or(orClauses.join(","))
      .maybeSingle();

    if (existingError) {
      console.error("webhook duplicate payment check failed", existingError);
      throw new Error(`Payment duplicate check failed: ${existingError.message}`);
    }

    if (existing?.id) {
      console.log("webhook skipping duplicate payment insert", {
        txRef,
        transactionId,
      });
      return;
    }
  }

  const { error } = await service.from("payments").insert(paymentData);
  if (error) {
    console.error("webhook payment insert failed", error, paymentData);
    throw new Error(`Payment insert failed: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service role not configured" }, 500);
    }

    const service = createClient(supabaseUrl, serviceRoleKey);

    const event = await req.json();
    const type = event?.event;
    const data = event?.data || {};
    const paymentStatus = data?.status ?? null;
    const email = data?.customer?.email ?? null;
    const txRef = data?.tx_ref ?? null;
    const transactionId = data?.id ?? null;
    const metadata: any = data?.meta || {};

    let workspaceId = metadata?.workspace_id ?? null;
    let userId = metadata?.user_id ?? null;

    console.log("flutterwave webhook event", {
      type,
      paymentStatus,
      email,
      txRef,
      transactionId,
      workspaceId,
      userId,
      metadata,
    });

    // Fallback lookup for userId by email only.
    if (!userId && email) {
      const { data: profile, error: profileError } = await service
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) {
        console.error("webhook profile lookup failed", profileError, { email });
      } else if (profile?.id) {
        userId = profile.id;
      }
    }

    // IMPORTANT:
    // We no longer try to parse workspace_id from tx_ref.
    // It must come from Flutterwave metadata.
    if (!workspaceId) {
      console.error("webhook missing workspace_id in metadata", {
        txRef,
        transactionId,
        metadata,
      });

      return jsonResponse({ error: "Missing workspace_id in payment metadata" }, 400);
    }

    // Successful payment path
    if (type === "charge.completed" && paymentStatus === "successful") {
      const paymentData: any = {
        email,
        amount: data?.amount ?? null,
        currency: data?.currency || "USD",
        status: paymentStatus,
        tx_ref: txRef,
        transaction_id: transactionId,
        payment_method: data?.payment_type || data?.payment_method || null,
        plan: "pro",
      };

      if (userId) {
        paymentData.user_id = userId;
      }

      await insertPaymentIfMissing(service, paymentData);
      await activateSubscription(service, workspaceId);
      await updateProfileIfPossible(service, email, userId, "active");

      console.log("flutterwave webhook success handled", {
        workspaceId,
        txRef,
        transactionId,
      });

      return jsonResponse({ success: true, workspaceId });
    }

    // Failed / non-successful charge path
    if (type === "charge.completed" || type === "charge.failed") {
      await markPastDue(service, workspaceId);
      await updateProfileIfPossible(service, email, userId, "past_due");

      console.log("flutterwave webhook marked past_due", {
        workspaceId,
        txRef,
        transactionId,
        type,
        paymentStatus,
      });

      return jsonResponse({ received: true, status: "past_due", workspaceId });
    }

    return jsonResponse({ received: true, ignored: true });
  } catch (err: any) {
    console.error("flutterwave webhook catch", err);
    return jsonResponse({ error: err?.message || "internal" }, 500);
  }
});