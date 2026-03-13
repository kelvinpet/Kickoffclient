import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

CURRENCY HANDLING: Use the currency from client input. If none specified, infer from context or default to USD.

INDUSTRY AWARENESS: Tailor everything to the specific project type. No generic advice.`;

function buildUserPrompt(answersJson: string, mode: string, businessName?: string) {
  const modeInstructions = mode === "detailed"
    ? "\n\nIMPORTANT: The user requested MAXIMUM DETAIL. Make every section 2-3x longer. Add more risks, questions, milestones, and concrete examples."
    : mode === "proposal"
    ? "\n\nIMPORTANT: Make the scope_doc a formal Statement of Work with acceptance criteria. Make executive_summary read like a proposal intro. Keep other sections concise but professional."
    : "";
  const brandInstruction = businessName ? `\n\nBUSINESS_NAME: "${businessName}". Use this name in the kickoff_email sign-off and any references to the service provider. Do NOT use "KickoffClient".` : "";

  return `Analyze this client intake data (JSON):

${answersJson}
${modeInstructions}${brandInstruction}

Return a JSON object with EXACTLY these keys. Every section must be substantive — not short or generic.

MINIMUM DEPTH RULES:
- confirmed_facts: minimum 5 items directly from client input
- assumptions: minimum 5 AI interpretations or likely causes
- needs_clarification: minimum 5 questions that must be confirmed
- executive_summary: 8-12 sentences
- problem_diagnosis.root_causes: minimum 5 items
- solution_blueprint.phases: minimum 4 phases
- scope_doc.in_scope: minimum 8 bullets
- scope_doc.out_of_scope: minimum 6 bullets
- risks: minimum 6 with severity + likelihood + mitigation
- milestones: minimum 5
- missing_info: minimum 3 questions per category

{
  "confirmed_facts": ["Facts directly stated by the client in their intake form — quote or paraphrase exactly what they said"],

  "assumptions": ["Things the AI inferred or interpreted that were NOT explicitly stated — label each as an assumption"],

  "needs_clarification": ["Critical questions that must be answered before the project can proceed — specific to THIS project"],

  "executive_summary": "8-12 sentences. Restate the project in business terms: goal, audience, why now, success definition, key constraints.",

  "problem_diagnosis": {
    "description": "2-4 sentences describing the underlying business problem(s).",
    "root_causes": ["5-7 hypotheses based on the intake data"],
    "implications": "What happens if these are not addressed."
  },

  "solution_blueprint": {
    "phases": [
      {
        "name": "Phase name",
        "deliverables": ["Specific deliverable 1", "Specific deliverable 2"],
        "duration": "Estimated duration"
      }
    ],
    "tools_and_stack": ["Recommended tools/tech if relevant"],
    "assumptions": ["Key assumptions"],
    "constraints": ["Key constraints"]
  },

  "scope_doc": {
    "in_scope": ["Minimum 8 detailed bullets of what IS included"],
    "out_of_scope": ["Minimum 6 detailed bullets of what is NOT included"],
    "acceptance_criteria": ["Clear, measurable outcomes that define done"]
  },

  "timeline": {
    "overview": "High-level timeline summary",
    "breakdown": [
      { "period": "Week 1-2", "activities": "What happens", "dependencies": "What could delay this" }
    ],
    "delay_risks": "What can delay the timeline and how to prevent it."
  },

  "milestones": [
    {
      "name": "Milestone name",
      "output": "What is delivered",
      "signoff": "Who signs off and how"
    }
  ],

  "risks": [
    {
      "risk": "Risk description",
      "severity": "High/Medium/Low",
      "likelihood": "High/Medium/Low",
      "mitigation": "Specific mitigation steps"
    }
  ],

      const SYSTEM_PROMPT = `You are a senior digital strategy consultant, agency strategist, and project scoping expert. Your task is to generate a premium, consultant-grade kickoff analysis for a client project, using the exact JSON schema below. The report must be rich, practical, business-aware, and tailored to the client’s industry, goal, budget, and timeline.
    "business_goals": ["Targeted questions specific to THIS project"],
    "users_audience": ["Questions about target users"],
    "content_assets": ["Questions about content/assets readiness"],
    "branding": ["Questions about branding/design preferences"],
    "technical": ["Questions about technical requirements"],
    "compliance_legal": ["Questions about legal/compliance needs"],
    "budget_timeline": ["Questions about budget and timeline"]
  },

  "kickoff_email": "Professional email draft (5-8 paragraphs): recap project, proposed timeline, what you need from client, next meeting prompt. Sign off using the BUSINESS_NAME provided below, not 'KickoffClient'.",

  "suggested_budget": {
    "analysis": "2-4 sentences on whether the stated budget is realistic.",
    "what_is_possible": "What CAN realistically be delivered within the stated budget.",
    "what_is_not_possible": "What CANNOT be done at the stated budget and why.",
    "minimum_viable": "Cheapest practical MVP with what it covers.",
    "recommended": "Recommended budget for full scope with justification.",
    "premium": "Premium budget with extras.",
    "currency_note": "Currency used.",
        const ensureArray = (v: any, fallback: any[] = []) => Array.isArray(v) ? v : v ? [v] : fallback;
        const ensureObject = (v: any, fallback: any = {}) => v && typeof v === "object" ? v : fallback;
        const ensureString = (v: any, fallback: string = "") => typeof v === "string" && v.trim() ? v.trim() : fallback;
        const ensureNumber = (v: any, fallback: number = 0) => typeof v === "number" && !isNaN(v) ? v : fallback;

        const normalized: any = {
          confirmed_facts: ensureArray(core.confirmed_facts, ["No confirmed facts provided."]),
          assumptions: ensureArray(core.assumptions, ["No assumptions identified."]),
          needs_clarification: ensureArray(core.needs_clarification, ["No clarification questions generated."]),
          executive_summary: ensureString(core.executive_summary, "No executive summary provided."),
          problem_diagnosis: ensureString(core.problem_diagnosis, "No problem diagnosis provided."),
          root_causes: ensureArray(core.root_causes, ["No root causes identified."]),
          implications: ensureArray(core.implications, ["No implications specified."]),
          solution_blueprint: ensureString(core.solution_blueprint, "No solution blueprint provided."),
          scope_of_work: ensureObject(core.scope_of_work, {
            in_scope: ["No in-scope items defined."],
            out_of_scope: ["No out-of-scope items defined."],
            acceptance_criteria: ["No acceptance criteria defined."]
          }),
          budget_analysis: ensureObject(core.budget_analysis, {
            minimum_viable: "No minimum viable budget analysis provided.",
            recommended: "No recommended budget analysis provided.",
            premium: "No premium budget analysis provided."
          }),
          timeline_analysis: ensureObject(core.timeline_analysis, {
            fast_track: "No fast track timeline analysis provided.",
            standard: "No standard timeline analysis provided.",
            comfortable: "No comfortable timeline analysis provided."
          }),
          best_recommendation: ensureObject(core.best_recommendation, {
            package_name: "No package name provided.",
            why_this_is_the_best_first_move: "No reasoning provided.",
            recommended_starting_package: "No starting package provided."
          }),
          mvp_deliverables: ensureArray(core.mvp_deliverables, ["No MVP deliverables defined."]),
          timeline: ensureArray(core.timeline, ["No timeline defined."]),
          milestones: ensureArray(core.milestones, ["No milestones defined."]),
          risks_and_mitigation: ensureArray(core.risks_and_mitigation, ["No risks identified."]),
          implementation_notes: ensureArray(core.implementation_notes, ["No implementation notes provided."]),
          follow_up_questions: ensureArray(core.follow_up_questions, ["No follow-up questions generated."]),
          kickoff_email: ensureString(core.kickoff_email, "No kickoff email provided."),
          score: ensureObject(core.score, {
            clarity: ensureNumber(core.score?.clarity, 0),
            scope_risk: ensureNumber(core.score?.scope_risk, 0),
            budget_realism: ensureNumber(core.score?.budget_realism, 0),
            timeline_realism: ensureNumber(core.score?.timeline_realism, 0)
          }),
          red_flags: ensureArray(core.red_flags, ["No red flags identified."]),
          next_steps: ensureArray(core.next_steps, ["No next steps defined."])
        };
        return normalized;
      }
}

Scores are 0-100. Output ONLY valid JSON. No markdown fences, no extra keys.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id, answers, regenerate, report_id, mode, business_name } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch workspace business name if not provided
    let resolvedBusinessName = business_name;
    if (!resolvedBusinessName) {
      const { data: submission } = await supabase
        .from("submissions")
        .select("template_id")
        .eq("id", submission_id)
        .single();
      if (submission?.template_id) {
        const { data: template } = await supabase
          .from("templates")
          .select("workspace_id")
          .eq("id", submission.template_id)
          .single();
        if (template?.workspace_id) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("business_name")
            .eq("id", template.workspace_id)
            .single();
          resolvedBusinessName = ws?.business_name;
        }
      }
    }

    const { data: submission } = await supabase
      .from("submissions")
      .select("template_id")
      .eq("id", submission_id)
      .single();

    let labeledAnswers = answers;
    if (submission?.template_id) {
      const { data: fields } = await supabase
        .from("template_fields")
        .select("id, label, field_type")
        .eq("template_id", submission.template_id)
        .order("position");

      if (fields && fields.length > 0) {
        const labeled: Record<string, any> = {};
        for (const field of fields) {
          const val = answers[field.id];
          if (val !== undefined && val !== null && val !== "") {
            labeled[field.label] = val;
          }
        }
        labeledAnswers = labeled;
      }
    }

    const answersJson = JSON.stringify(labeledAnswers, null, 2);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(answersJson, mode || "standard", resolvedBusinessName) },
        ],
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON: " + content.substring(0, 200));
    }

    const reportData = {
      submission_id,
      summary: JSON.stringify(parsed),
      missing_info: parsed.missing_info ? (Array.isArray(parsed.missing_info) ? parsed.missing_info : [JSON.stringify(parsed.missing_info)]) : [],
      risks: parsed.risks ? (Array.isArray(parsed.risks) ? parsed.risks.map((r: any) => typeof r === "string" ? r : JSON.stringify(r)) : []) : [],
      timeline: typeof parsed.timeline === "string" ? parsed.timeline : JSON.stringify(parsed.timeline || ""),
      milestones: parsed.milestones ? (Array.isArray(parsed.milestones) ? parsed.milestones.map((m: any) => typeof m === "string" ? m : JSON.stringify(m)) : []) : [],
      kickoff_email: parsed.kickoff_email || "",
      scope_doc: typeof parsed.scope_doc === "string" ? parsed.scope_doc : JSON.stringify(parsed.scope_doc || ""),
    };

    let report;
    let error;

    if (regenerate && report_id) {
      const result = await supabase
        .from("ai_reports")
        .update(reportData)
        .eq("id", report_id)
        .select()
        .single();
      report = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("ai_reports")
        .insert(reportData)
        .select()
        .single();
      report = result.data;
      error = result.error;
    }

    if (error) throw error;

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
