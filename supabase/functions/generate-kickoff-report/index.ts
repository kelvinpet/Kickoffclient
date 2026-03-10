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

const SYSTEM_PROMPT = `You are a senior project strategist for service businesses (agencies, freelancers, studios). You produce detailed, consultant-grade project kickoff documents.

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
EMAIL INSTRUCTIONS: The kickoff_email field must be a structured consultant-style message. Subject must be "Project Kickoff — {Company Name} Growth Plan". Include:
   1. Greeting with client/company name
   2. Short recap of project goal
   3. Key opportunity areas as bullet list
   4. Recommended starting approach
   5. Request for any missing information
   6. Link to the client portal
   7. Next step (kickoff call or approval)
   8. Professional sign-off using the provided BUSINESS_NAME. Use a confident consultant voice; avoid generic phrases like "we are excited" and never mention "KickoffClient".
CURRENCY HANDLING: Use the currency from client input. If none specified, infer from context or default to USD.

INDUSTRY AWARENESS: Tailor everything to the specific project type. No generic advice.`;

function buildUserPrompt(answersJson: string, mode: string, businessName?: string) {
  // this prompt now mirrors the core generator logic; email/proposal omitted
  const modeInstructions =
    mode === "detailed"
      ? "\n\nIMPORTANT: The user requested MAXIMUM DETAIL. Make every section 2-3x longer. Add more risks, questions, milestones, and concrete examples."
      : mode === "proposal"
      ? "\n\nIMPORTANT: Make the scope_doc a formal Statement of Work with acceptance criteria. Make executive_summary read like a proposal intro. Keep other sections concise but professional."
      : "";

  const brandInstruction = businessName
    ? `\n\nBUSINESS_NAME: "${businessName}". Use this name in any references to the service provider. Do NOT use \"KickoffClient\".`
    : "";

  return `Analyze this client intake data (JSON):

${answersJson}${modeInstructions}${brandInstruction}

Return ONLY a JSON object matching the CoreReport schema with these keys:
confirmed_facts, assumptions, needs_clarification, executive_summary,
problem_diagnosis, solution_blueprint, scope_doc, timeline, milestones,
risks, missing_info, suggested_budget, suggested_timeline,
mvp_adjustment, best_recommendation, negotiation_script,
kickoff_iq_score, next_step_recommendation

Strict rules: no kickoff_email, no proposal, no pricing content; never wrap in markdown or add extra keys.
`;
}

function safeArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

async function callGroq(userPrompt: string, apiKey: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      top_p: 1,
      response_format: { type: "json_object" },
      max_completion_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Groq returned empty content");
  }

  return content.trim();
}

async function getBusinessName(supabase: any, submissionId: string, fallback?: string) {
  if (fallback) return fallback;

  const { data: submission } = await supabase
    .from("submissions")
    .select("template_id")
    .eq("id", submissionId)
    .single();

  if (!submission?.template_id) return null;

  const { data: template } = await supabase
    .from("templates")
    .select("workspace_id")
    .eq("id", submission.template_id)
    .single();

  if (!template?.workspace_id) return null;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("business_name")
    .eq("id", template.workspace_id)
    .single();

  return workspace?.business_name ?? null;
}

async function getLabeledAnswers(supabase: any, submissionId: string, answers: Record<string, any>) {
  const { data: submission } = await supabase
    .from("submissions")
    .select("template_id")
    .eq("id", submissionId)
    .single();

  if (!submission?.template_id) return answers;

  const { data: fields } = await supabase
    .from("template_fields")
    .select("id, label, field_type")
    .eq("template_id", submission.template_id)
    .order("position");

  if (!fields?.length) return answers;

  const labeled: Record<string, any> = {};

  for (const field of fields) {
    const val = answers?.[field.id];
    if (val !== undefined && val !== null && val !== "") {
      labeled[field.label] = val;
    }
  }

  return Object.keys(labeled).length ? labeled : answers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      submission_id,
      answers,
      regenerate,
      report_id,
      mode = "standard",
      business_name,
    } = body ?? {};

    if (!submission_id) {
      throw new Error("submission_id is required");
    }

    if (!answers || typeof answers !== "object") {
      throw new Error("answers is required and must be an object");
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resolvedBusinessName = await getBusinessName(
      supabase,
      submission_id,
      business_name
    );

    const labeledAnswers = await getLabeledAnswers(supabase, submission_id, answers);
    const answersJson = JSON.stringify(labeledAnswers, null, 2);
    const userPrompt = buildUserPrompt(answersJson, mode, resolvedBusinessName ?? undefined);

    let parsed: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const content = await callGroq(userPrompt, GROQ_API_KEY);
        parsed = JSON.parse(content);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!parsed) {
      throw new Error(`Failed to parse Groq JSON output. ${lastError?.message ?? ""}`);
    }

    const coreOnly = { ...parsed };
    // drop email/proposal/pricing if accidentally present
    delete coreOnly.kickoff_email;
    delete coreOnly.proposal;
    delete coreOnly.pricing;

    const reportData: any = {
      submission_id,
      core_report_json: coreOnly,
      report_version: "v2",
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // legacy fields for backwards compatibility
      summary: JSON.stringify(parsed),
      missing_info: parsed.missing_info ? [JSON.stringify(parsed.missing_info)] : [],
      risks: safeArray(parsed.risks),
      timeline:
        typeof parsed.timeline === "string"
          ? parsed.timeline
          : JSON.stringify(parsed.timeline ?? {}),
      milestones: safeArray(parsed.milestones),
      scope_doc:
        typeof parsed.scope_doc === "string"
          ? parsed.scope_doc
          : JSON.stringify(parsed.scope_doc ?? {}),
    };

    let result;

    if (regenerate && report_id) {
      result = await supabase
        .from("ai_reports")
        .update(reportData)
        .eq("id", report_id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("ai_reports")
        .insert(reportData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return new Response(JSON.stringify({ report: result.data }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message || "Unexpected error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});