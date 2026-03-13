import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior project strategist and digital agency consultant. You produce detailed, consultant-grade project kickoff documents.

TONE & STYLE:
- Confident, direct, and natural. No corporate hedging.
- Use short paragraphs and clear bullet points.
- Professional but plain-spoken.

CRITICAL RULES:
1. ALWAYS separate facts from assumptions.
2. Be brutally honest about unrealistic budgets or timelines.
3. Use the currency from client input (default to USD).
4. End with ONE clear recommendation for the next step.

IMPORTANT:
- If the provided intake data is sparse or vague (e.g., 'I want more visits to my saloon'), you MUST use industry expertise to hallucinate a full, professional strategy.
- NEVER return empty strings or arrays. Fill sections with 'Professional Assumptions'.
- Output JSON keys MUST match: executive_summary, confirmed_facts, assumptions, needs_clarification, problem_diagnosis, solution_blueprint, scope_doc, suggested_budget, suggested_timeline, best_recommendation, risks, milestones, kickoff_email.
`;

// --- FIX: Added the missing buildUserPrompt function ---
function buildUserPrompt(answersJson: string, mode: string, businessName?: string) {
  const modeInstructions = mode === "detailed" 
    ? "The user requested MAXIMUM detail. Expand every section 2x." 
    : "Be professional and concise.";
  const brand = businessName ? `Our business is "${businessName}".` : "";

  return `Analyze this client intake data:
${answersJson}

${modeInstructions} ${brand}

Return a JSON object containing the full kickoff strategy.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submission_id, answers, regenerate, report_id, mode, business_name } = await req.json();
    
    // Switch this to GROQ_API_KEY in your Supabase Vault
    const API_KEY = Deno.env.get("GROQ_API_KEY"); 
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Resolve Business Name
    let resolvedBusinessName = business_name;
    if (!resolvedBusinessName) {
      const { data: sub } = await supabase.from("submissions").select("templates(workspace_id)").eq("id", submission_id).single();
      const wsId = (sub as any)?.templates?.workspace_id;
      if (wsId) {
        const { data: ws } = await supabase.from("workspaces").select("business_name").eq("id", wsId).single();
        resolvedBusinessName = ws?.business_name;
      }
    }

    // 2. Map Answers to Labels
    const { data: subData } = await supabase.from("submissions").select("template_id").eq("id", submission_id).single();
    const { data: fields } = await supabase.from("template_fields").select("id, label").eq("template_id", subData?.template_id);
    
    const labeledAnswers = fields?.reduce((acc: any, f: any) => {
      if (answers[f.id]) acc[f.label] = answers[f.id];
      return acc;
    }, {}) || answers;

    // 3. AI Call (Groq Implementation)
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${API_KEY}` 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Or your preferred Groq model
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(JSON.stringify(labeledAnswers), mode || "standard", resolvedBusinessName) },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await aiResponse.json();
    if (!aiData.choices) throw new Error("AI failed to return data: " + JSON.stringify(aiData));
    
    const parsed = JSON.parse(aiData.choices[0].message.content);

    // 4. Prepare for Database
    const reportData = {
      submission_id,
      summary: JSON.stringify(parsed),
      missing_info: parsed.needs_clarification || [],
      risks: parsed.risks || [],
      timeline: JSON.stringify(parsed.suggested_timeline || {}),
      milestones: parsed.milestones || [],
      kickoff_email: parsed.kickoff_email || "",
      scope_doc: JSON.stringify(parsed.scope_doc || {}),
    };

    // 5. Upsert
    const query = regenerate && report_id 
      ? supabase.from("ai_reports").update(reportData).eq("id", report_id)
      : supabase.from("ai_reports").insert(reportData);

    const { data: report, error } = await query.select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ report }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) { // FIX: Added : any to handle the err type
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});