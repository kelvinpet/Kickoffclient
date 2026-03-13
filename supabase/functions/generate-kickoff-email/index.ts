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

const EMAIL_PROMPT = `Compose a consultant-style kickoff email using the following structured report data. Use placeholders directly from the JSON rather than re-describing them where possible. The final JSON output should be a string representing the email text only.

Remember the original instructions for tone, greeting, recap, bullets, next step, and sign-off (use BUSINESS_NAME placeholder).
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
      .select("core_report_json, proposal_json, pricing_page_json, summary, kickoff_email")
      .eq("submission_id", submission_id)
      .single();

    const core = report.core_report_json || {};
    // if email already exists, optionally regenerate or return existing

    const prompt = `${EMAIL_PROMPT}\n${JSON.stringify(core)}`;

    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: "" },
        { role: "user", content: prompt },
      ],
    };
    console.log("kickoff-email groq payload", { groqPayload });
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      },
      body: JSON.stringify(groqPayload),
    });
    const rawText = await res.text();
    console.log("kickoff-email groq response", { status: res.status, rawText });
    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status} - ${rawText}`);
    }
    let emailText = rawText;
    try {
      const parsed = JSON.parse(rawText);
      emailText = parsed?.choices?.[0]?.message?.content || rawText;
    } catch (e) {
      console.error("kickoff-email parse error", e, { rawText });
    }

    await supabase.from("ai_reports").update({
      kickoff_email: emailText,
      email_generated_at: new Date().toISOString(),
    }).eq("submission_id", submission_id);

    return new Response(JSON.stringify({ email: emailText }), { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
};