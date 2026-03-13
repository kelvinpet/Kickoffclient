// @ts-nocheck
/// <reference types="deno" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
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

    const email = body?.email?.trim();
    const user_id = body?.user_id ?? null;
    const workspace_id = body?.workspace_id ?? null;

    if (!email || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing email or workspace_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      console.error("flutterwave checkout missing secret key");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IMPORTANT:
    // Use ":" as delimiter so we never need to parse UUIDs from "-" strings.
    const tx_ref = `kickoff:${workspace_id}:${crypto.randomUUID()}`;

    let redirectUrl: string;
    if (body?.redirect_base) {
      redirectUrl = `${String(body.redirect_base).replace(/\/$/, "")}/payment-success`;
    } else if (Deno.env.get("NODE_ENV") === "development") {
      redirectUrl = "http://localhost:8080/payment-success";
    } else {
      redirectUrl = "https://kickoffclient.com/payment-success";
    }

    const payload = {
      tx_ref,
      redirect_url: redirectUrl,
      customer: { email },
      amount: 19,
      currency: "USD",
      customizations: {
        title: "KickoffClient Pro",
        description: "KickoffClient Pro upgrade",
      },
      meta: {
        workspace_id,
        user_id,
        plan: "pro",
      },
    };

    console.log("flutterwave checkout payload", payload);

    const fwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = fwRes.headers.get("content-type") || "";
    let fwData: any;

    if (contentType.includes("application/json")) {
      fwData = await fwRes.json();
    } else {
      const rawText = await fwRes.text();
      console.error("flutterwave checkout non-json response", {
        status: fwRes.status,
        contentType,
        rawText,
      });

      return new Response(
        JSON.stringify({
          error: "Unexpected response from Flutterwave",
          details: rawText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("flutterwave checkout response", {
      httpStatus: fwRes.status,
      tx_ref,
      link: fwData?.data?.link ?? null,
      flutterwaveTransactionId: fwData?.data?.id ?? null,
      message: fwData?.message ?? null,
    });

    if (!fwRes.ok || !fwData?.data?.link) {
      console.error("flutterwave checkout failed", fwData);
      return new Response(
        JSON.stringify({
          error: fwData?.message || "Failed to create payment link",
          details: fwData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        payment_link: fwData.data.link,
        tx_ref,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("flutterwave checkout catch", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});