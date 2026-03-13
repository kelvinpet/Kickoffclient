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

const PROPOSAL_PROMPT = `Using the structured core report below, generate a client proposal document. Organize the output into clearly titled sections (Executive Summary, Scope of Work, Timeline, Budget, Recommended Package, etc.). Return a JSON object with a "sections" array, each item having a "title" and "content" field. Content may be string or array. Avoid generating an email or pricing page here.
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
      .select("core_report_json, proposal_json")
      .eq("submission_id", submission_id)
      .single();

    const core = report.core_report_json || {};
    const prompt = `${PROPOSAL_PROMPT}\n${JSON.stringify(core)}`;
    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    };
    console.log("client-proposal groq payload", { groqPayload });
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      },
      body: JSON.stringify(groqPayload),
    });
    const rawText = await res.text();
    console.log("client-proposal groq response", { status: res.status, rawText });
    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status} - ${rawText}`);
    }
    let proposalJson: any;
    try {
      const parsed = JSON.parse(rawText);
      proposalJson = parsed?.choices?.[0]?.message?.content;
      if (proposalJson) proposalJson = JSON.parse(proposalJson);
    } catch (e) {
      console.error("client-proposal parse error", e, { rawText });
      proposalJson = rawText;
    }

    await supabase.from("ai_reports").update({
      proposal_json: proposalJson,
      proposal_generated_at: new Date().toISOString(),
    }).eq("submission_id", submission_id);

    return new Response(JSON.stringify({ proposal: proposalJson }), { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
};