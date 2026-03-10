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

const SYSTEM_PROMPT_CORE = `You are a senior project strategist for service businesses (agencies, freelancers, studios). You produce detailed, consultant-grade project kickoff documents.

TONE & STYLE:
- Write like a confident consultant, not a corporate robot. Be direct and natural.
- Use short paragraphs and clear bullet points. Every sentence earns its place.
- Say "do this" not "you may consider potentially doing this." No hedging.
- Avoid jargon unless the client used it first. Speak plainly.
- Write as if a client is paying $500/hour for this analysis.

CRITICAL RULES:
1. ALWAYS separate facts from assumptions. If the client said it, it's a fact. If you inferred it, it's an assumption. Label them clearly.
2. When budget is unrealistic, be honest: state what CAN be done, what CANNOT, and the cheapest viable MVP.
3. When timeline is unrealistic, state what's possible, what to defer, and the realistic timeline.
4. End with ONE clear recommendation — the single best next step.


Analysis output must be pure JSON matching the CoreReport schema exactly. No extra keys, no prose outside JSON. Do not generate an email or proposal in this step.

`; 

function buildCorePrompt(answersJson: string, mode: string, businessName?: string) {
  const modeInstructions =
    mode === "detailed"
      ? "\n\nIMPORTANT: The user requested MAXIMUM DETAIL. Make every section 2-3x longer. Add more risks, questions, milestones, and concrete examples."
      : mode === "proposal"
      ? "\n\nIMPORTANT: Make the scope_doc a formal Statement of Work with acceptance criteria. Make executive_summary read like a proposal intro. Keep other sections concise but professional."
      : "";

  const brandInstruction = businessName
    ? `\n\nBUSINESS_NAME: "${businessName}". Use this name in any references to the service provider. Do NOT use \"KickoffClient\".`
    : "";

  // note: same minimum-depth rules as before applied to core fields
  return `Analyze this client intake data (JSON):

${answersJson}${modeInstructions}${brandInstruction}

Output ONLY a JSON object with the following keys:
confirmed_facts, assumptions, needs_clarification, executive_summary,
problem_diagnosis, solution_blueprint, scope_doc, timeline, milestones,
risks, missing_info, suggested_budget, suggested_timeline,
mvp_adjustment, best_recommendation, negotiation_script,
kickoff_iq_score, next_step_recommendation

Each key must contain detailed, substantive content as per previous guidelines.
No kickoff_email or pricing or proposal content in this response.
`;
}

// keep the rest of the helper functions (safeArray etc.) from the original file
function safeArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders });
  }

  const { data: config } = await createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").
    from("config").select("*").single();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  try {
    const body = await req.json();
    const { submission_id, mode, business_name } = body;

    // pull submission data
    const { data: submission } = await supabase
      .from("submissions")
      .select("*, templates(title), answers, followup_answers")
      .eq("id", submission_id)
      .single();

    if (!submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404 });
    }

    const answersJson = JSON.stringify(submission.answers || {});
    const prompt = buildCorePrompt(answersJson, mode || "", business_name || config?.business_name);

    const openaiRes = await fetch("https://api.groq.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("GROQ_API_TOKEN")}`,
      },
      body: JSON.stringify({
        model: "groq:codex", // keep existing model
        prompt: SYSTEM_PROMPT_CORE + "\n" + prompt,
        max_tokens: 3000,
        temperature: 0.6,
      }),
    });

    const parsed = await openaiRes.json();
    const core = parsed.choices?.[0]?.text ? JSON.parse(parsed.choices[0].text) : parsed;

    // save core report json and legacy fields if desired
    await supabase.from("ai_reports").upsert({
      submission_id: submission_id,
      core_report_json: core,
      summary: parsed.choices?.[0]?.text || null,
      risks: core.risks,
      timeline: core.timeline?.overview,
      milestones: core.milestones,
      missing_info: core.missing_info,
      scope_doc: core.scope_doc,
      report_version: "v2",
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: ["submission_id"] });

    return new Response(JSON.stringify({ success: true, core_report_json: core }), { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
};
