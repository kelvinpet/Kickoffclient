// @ts-nocheck
/// <reference types="deno" />
// 
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

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("flutterwave checkout parse error", parseErr);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("flutterwave checkout request body", body);

    const email = body?.email;
    const user_id = body?.user_id; // may be used for metadata
    const workspace_id = body?.workspace_id;

    if (!email || !workspace_id) {
      return new Response(JSON.stringify({ error: "Missing email or workspace id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // include workspace id in tx_ref so we can look it up later
    // allow callers (e.g. during testing) to override the plan id
    const defaultPlan = Deno.env.get("FLUTTERWAVE_PLAN_ID") || "155339";

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    console.log("env keys", { hasSecret: !!secretKey, defaultPlan });
    if (!secretKey) {
      console.error("flutterwave checkout missing secret key");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PLAN_ID = body.plan_id || defaultPlan;
    const tx_ref = `kickoff-${workspace_id}-${Date.now()}`;

    // determine redirect URL; prefer an explicit value from the client if provided
    let redirectUrl: string;
    if (body?.redirect_base) {
      redirectUrl = `${body.redirect_base.replace(/\/$/, "")}/payment-success`;
    } else if (Deno.env.get("NODE_ENV") === "development") {
      redirectUrl = "http://localhost:8080/payment-success";
    } else {
      redirectUrl = "https://kickoffclient.com/payment-success";
    }

    // build payload for plan subscription/payment
    // Flutterwave's API requires POST /v3/payments with a `payment_plan` field
    // (the older /subscriptions endpoint may not be available in some accounts).
    const payload: any = {
      tx_ref,
      redirect_url: redirectUrl,
      customer: { email },
      payment_plan: PLAN_ID,
      // include amount & currency as a fallback; plan defines recurring amount
      amount: 19,
      currency: "USD",
      customizations: {
        title: "KickoffClient Pro",
        description: "KickoffClient $19 monthly subscription",
      },
      // include workspace id in metadata so we can always identify the target
      meta: {
        workspace_id,
        user_id,
      },
    };

    console.log("flutterwave checkout payload", {
      plan: PLAN_ID,
      tx_ref,
      workspace_id,
    });

    // use payments endpoint with payment_plan to create first charge and
    // subscribe customer to the plan.  /subscriptions caused HTML errors.
    const fwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // ensure we received JSON back; if not, dump the raw text for debugging
    let fwData: any;
    const contentType = fwRes.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await fwRes.text();
      console.error("flutterwave non-json response", { status: fwRes.status, contentType, text });
      // try to parse anyway to trigger error or return message if possible
      try {
        fwData = JSON.parse(text);
      } catch (parseErr) {
        return new Response(JSON.stringify({ error: "Unexpected response from Flutterwave", details: text }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      fwData = await fwRes.json();
    }

    // log identifiers returned by flutterwave for debugging
    console.log("flutterwave payment response", {
      status: fwRes.status,
      link: fwData.data?.link,
      transactionId: fwData.data?.id || null,
      paymentId: fwData.data?.id || null,
      plan: PLAN_ID,
      tx_ref,
    });

    if (!fwRes.ok || !fwData.data?.link) {
      console.error("flutterwave subscription error", fwRes.status, fwData);
      return new Response(JSON.stringify({ error: fwData.message || "Failed to create subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // plan ID and tx_ref logged above; return link to readonly client
    return new Response(JSON.stringify({ payment_link: fwData.data.link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("flutterwave checkout catch", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});