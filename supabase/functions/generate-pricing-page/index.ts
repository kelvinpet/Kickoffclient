// @ts-nocheck
/// <reference types="deno" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICING_PROMPT = `Using the structured core report below, produce pricing page data. Focus on suggested_budget, suggested_timeline, best_recommendation, and mvp_adjustment. Output a JSON object with a "packages" array; each package should include name, scope_summary, budget, timeline, and optionally recommended:true.
`;

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  try {
    const { submission_id } = await req.json();
    const { data: report } = await supabase
      .from("ai_reports")
      .select("core_report_json, pricing_page_json")
      .eq("submission_id", submission_id)
      .single();

    const core = report.core_report_json || {};
    const prompt = `${PRICING_PROMPT}\n${JSON.stringify(core)}`;
    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    };
    console.log("pricing-page groq payload", { groqPayload });
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      },
      body: JSON.stringify(groqPayload),
    });
    const rawText = await res.text();
    console.log("pricing-page groq response", { status: res.status, rawText });
    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status} - ${rawText}`);
    }
    let pricingJson: any;
    try {
      const parsed = JSON.parse(rawText);
      pricingJson = parsed?.choices?.[0]?.message?.content;
      if (pricingJson) pricingJson = JSON.parse(pricingJson);
    } catch (e) {
      console.error("pricing-page parse error", e, { rawText });
      pricingJson = rawText;
    }

    await supabase.from("ai_reports").update({
      pricing_page_json: pricingJson,
      pricing_generated_at: new Date().toISOString(),
    }).eq("submission_id", submission_id);

    return new Response(JSON.stringify({ pricing: pricingJson }), { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
};