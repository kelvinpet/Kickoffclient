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
    const res = await fetch("https://api.groq.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GROQ_API_TOKEN")}`,
      },
      body: JSON.stringify({ model: "groq:codex", prompt, max_tokens: 1500, temperature: 0.6 }),
    });
    const data = await res.json();
    const pricingJson = data.choices?.[0]?.text ? JSON.parse(data.choices[0].text) : data;

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