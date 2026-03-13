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

  console.log("verify subscription upsert payload", subscriptionPayload);

  const { error } = await service
    .from("subscriptions")
    .upsert(subscriptionPayload, { onConflict: "workspace_id" });

  if (error) {
    console.error("verify subscription upsert failed", error, subscriptionPayload);
    throw new Error(`Subscription upsert failed: ${error.message}`);
  }
}

async function updateProfileIfPossible(
  service: ReturnType<typeof createClient>,
  email?: string | null,
  userId?: string | null
) {
  const updates = {
    subscription_status: "active",
    subscription_started_at: new Date().toISOString(),
  };

  if (userId) {
    const { error } = await service
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("verify profile update by id failed", error, { userId });
    }
    return;
  }

  if (email) {
    const { error } = await service
      .from("profiles")
      .update(updates)
      .eq("email", email);

    if (error) {
      console.error("verify profile update by email failed", error, { email });
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
      console.error("verify duplicate payment check failed", existingError);
      throw new Error(`Payment duplicate check failed: ${existingError.message}`);
    }

    if (existing?.id) {
      console.log("verify skipping duplicate payment insert", {
        txRef,
        transactionId,
      });
      return;
    }
  }

  const { error } = await service.from("payments").insert(paymentData);
  if (error) {
    console.error("verify payment insert failed", error, paymentData);
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

    const { tx_ref, transaction_id } = await req.json();

    if (!tx_ref && !transaction_id) {
      return jsonResponse({ error: "Missing identifier" }, 400);
    }

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service role not configured" }, 500);
    }

    const service = createClient(supabaseUrl, serviceRoleKey);

    const verifyUrl = transaction_id
      ? `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
          tx_ref
        )}`;

    const fwRes = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const contentType = fwRes.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const rawText = await fwRes.text();
      console.error("flutterwave verify non-json response", {
        status: fwRes.status,
        rawText,
      });
      return jsonResponse(
        { error: "Unexpected response from Flutterwave", details: rawText },
        500
      );
    }

    const fwData = await fwRes.json();

    if (!fwRes.ok) {
      console.error("flutterwave verify error", fwRes.status, fwData);
      return jsonResponse(
        { error: fwData?.message || "Verification failed", details: fwData },
        400
      );
    }

    const paymentStatus = fwData?.data?.status;
    const email = fwData?.data?.customer?.email ?? null;
    const txRef = fwData?.data?.tx_ref ?? null;
    const transactionId = fwData?.data?.id ?? null;
    const metadata: any = fwData?.data?.meta || {};

    const workspaceId = metadata?.workspace_id ?? null;
    let userId = metadata?.user_id ?? null;

    console.log("flutterwave verify result", {
      paymentStatus,
      txRef,
      transactionId,
      workspaceId,
      userId,
      metadata,
    });

    if (paymentStatus !== "successful") {
      return jsonResponse({
        success: false,
        status: paymentStatus,
        workspaceId,
      });
    }

    if (!workspaceId) {
      console.error("verify missing workspace_id in metadata", { txRef, metadata });
      return jsonResponse({ error: "Missing workspace_id in payment metadata" }, 400);
    }

    if (!userId && email) {
      const { data: profile, error: profileError } = await service
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) {
        console.error("verify profile lookup failed", profileError, { email });
      } else if (profile?.id) {
        userId = profile.id;
      }
    }

    const paymentData: any = {
      email,
      amount: fwData?.data?.amount ?? null,
      currency: fwData?.data?.currency || "USD",
      status: paymentStatus,
      tx_ref: txRef,
      transaction_id: transactionId,
      payment_method:
        fwData?.data?.payment_type || fwData?.data?.payment_method || null,
      plan: "pro",
    };

    if (userId) {
      paymentData.user_id = userId;
    }

    await insertPaymentIfMissing(service, paymentData);
    await activateSubscription(service, workspaceId);
    await updateProfileIfPossible(service, email, userId);

    return jsonResponse({
      success: true,
      status: paymentStatus,
      workspaceId,
      tx_ref: txRef,
      transaction_id: transactionId,
    });
  } catch (err: any) {
    console.error("flutterwave verify catch", err);
    return jsonResponse({ error: err?.message || "Internal error" }, 500);
  }
});