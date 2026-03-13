import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Combine original answers with any follow-up answers returned by the portal.
 * Follow‑up values override the originals when a key collides.
 */
export function getMergedAnswers(submission: any): Record<string, any> {
  if (!submission) return {};
  const original = submission.answers || {};
  const followup = submission.followup_answers || {};
  return { ...original, ...followup };
}

/**
 * Derive a reliable client name/email pair by checking known answer keys first
 * and falling back to the top‑level submission fields.
 */
export function getClientIdentity(submission: any): { name: string; email: string } {
  const answers = getMergedAnswers(submission);
  const name =
    answers["Client Full Name"] ||
    answers["Full Name"] ||
    answers["Name"] ||
    submission?.client_name ||
    submission?.name ||
    "";

  const email =
    answers["Client Email"] ||
    answers["Email"] ||
    submission?.client_email ||
    submission?.email ||
    "";

  return { name, email };
}

/**
 * Normalize a submission row by merging answers, resolving identity, and
 * collecting follow‑up question text (based on the structured report).
 */
export function normalizeSubmission(submission: any, structured?: any) {
  const mergedAnswers = getMergedAnswers(submission);
  const { name, email } = getClientIdentity(submission);

  const followupQuestions: string[] = [];
  if (structured) {
    if (structured?.missing_info) {
      if (Array.isArray(structured.missing_info)) {
        followupQuestions.push(...structured.missing_info);
      } else if (typeof structured.missing_info === "object") {
        Object.values(structured.missing_info).forEach((qs: any) => {
          if (Array.isArray(qs)) followupQuestions.push(...qs);
        });
      }
    }
    if (structured?.needs_clarification && Array.isArray(structured.needs_clarification)) {
      structured.needs_clarification.forEach((q: string) => {
        if (!followupQuestions.includes(q)) followupQuestions.push(q);
      });
    }
  }

  return {
    ...submission,
    mergedAnswers,
    clientName: name,
    clientEmail: email,
    followupQuestions,
  };
}

// ------------------ structured report helpers ------------------
import { CoreReport } from "./types/reports";

/**
 * Safely parse JSON; returns null if parsing fails.
 */
export function safeJsonParse(str: any): any {
  if (!str) return null;
  if (typeof str !== "string") return str; // Already an object
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Basic runtime check that an object resembles a CoreReport.
 */
export function isValidCoreReportShape(obj: any): obj is CoreReport {
  if (!obj || typeof obj !== "object") return false;
  return typeof obj.executive_summary === "string" || typeof obj.problem_diagnosis === "object";
}

/**
 * Normalize an existing ai_reports row into a complete CoreReport object.
 */
export function normalizeLegacyReport(report: any): CoreReport {
  if (report.core_report_json && isValidCoreReportShape(report.core_report_json)) {
    return report.core_report_json as CoreReport;
  }

  const parsed = report.summary ? safeJsonParse(report.summary) : null;
  const base: any = (parsed && typeof parsed === "object") ? parsed : {};

  // --- AGGRESSIVE MAPPING BRIDGE ---
  // Map all possible AI keys to UI-expected keys, and always initialize every field
  base.executive_summary = base.executive_summary || base.summary || report.summary || "Executive summary not available.";
  base.confirmed_facts = Array.isArray(base.confirmed_facts) ? base.confirmed_facts : (Array.isArray(base.facts) ? base.facts : []);
  base.assumptions = Array.isArray(base.assumptions) ? base.assumptions : [];
  base.needs_clarification = Array.isArray(base.needs_clarification) ? base.needs_clarification : (Array.isArray(base.questions) ? base.questions : []);

  base.problem_diagnosis = base.problem_diagnosis || {
    description: base.diagnosis_description || "",
    root_causes: Array.isArray(base.root_causes) ? base.root_causes : [],
    implications: base.implications || ""
  };

  base.solution_blueprint = base.solution_blueprint || base.blueprint || {
    phases: Array.isArray(base.phases) ? base.phases : [],
    tools_and_stack: Array.isArray(base.tools_and_stack) ? base.tools_and_stack : [],
    assumptions: Array.isArray(base.solution_assumptions) ? base.solution_assumptions : [],
    constraints: Array.isArray(base.constraints) ? base.constraints : []
  };

  // Bridge for budget/timeline keys
  base.budget_analysis = base.budget_analysis || base.suggested_budget || base.budget || {
    analysis: "", what_is_possible: "", what_is_not_possible: "", minimum_viable: "", recommended: "", premium: ""
  };

  base.timeline_analysis = base.timeline_analysis || base.suggested_timeline || base.timeline || {
    analysis: "", realistic_timeline: "", fast_track: { duration: "", tradeoffs: "" }, standard: { duration: "", description: "" }
  };

  base.scope_of_work = base.scope_of_work || base.scope_doc || base.scope || { in_scope: [], out_of_scope: [], acceptance_criteria: [] };
  base.risks_and_mitigation = Array.isArray(base.risks_and_mitigation) ? base.risks_and_mitigation : (Array.isArray(base.risks) ? base.risks : []);
  base.milestones = Array.isArray(base.milestones) ? base.milestones : [];

  base.best_recommendation = base.best_recommendation || {
    approach: base.approach || base.recommended_approach || "",
    why: base.why || base.rationale || "",
    starting_package: base.starting_package || base.recommended_starting_package || { name: "", scope_summary: "", estimated_budget: "", estimated_timeline: "" }
  };

  base.kickoff_email = base.kickoff_email || report.kickoff_email || "";

  // Score mapping
  if (!base.score && (base.kickoff_iq_score || base.score_data)) {
    const s = base.kickoff_iq_score || base.score_data;
    base.score = {
      clarity: s.clarity_score || s.clarity || 0,
      scope_risk: s.scope_risk_score || s.scope_risk || 0,
      budget_realism: s.budget_realism_score || s.budget_realism || 0,
      timeline_realism: s.timeline_realism_score || s.timeline_realism || 0,
    };
  }

  // Final fallbacks to ensure nothing is undefined or null
  base.executive_summary = typeof base.executive_summary === "string" ? base.executive_summary : "Executive summary not available.";
  base.confirmed_facts = Array.isArray(base.confirmed_facts) ? base.confirmed_facts : [];
  base.assumptions = Array.isArray(base.assumptions) ? base.assumptions : [];
  base.needs_clarification = Array.isArray(base.needs_clarification) ? base.needs_clarification : [];
  base.negotiation_script = Array.isArray(base.negotiation_script) ? base.negotiation_script : [];
  base.mvp_adjustment = base.mvp_adjustment || { recommended: false, reduced_scope: [], deferred_features: [], mvp_budget: "", mvp_timeline: "", rationale: "" };
  base.next_step_recommendation = base.next_step_recommendation || { summary: report.next_step_recommendation || "" };
  base.problem_diagnosis = base.problem_diagnosis || { description: "", root_causes: [], implications: "" };
  base.solution_blueprint = base.solution_blueprint || { phases: [], tools_and_stack: [], assumptions: [], constraints: [] };
  base.budget_analysis = base.budget_analysis || { analysis: "", what_is_possible: "", what_is_not_possible: "", minimum_viable: "", recommended: "", premium: "" };
  base.timeline_analysis = base.timeline_analysis || { analysis: "", realistic_timeline: "", fast_track: { duration: "", tradeoffs: "" }, standard: { duration: "", description: "" } };
  base.scope_of_work = base.scope_of_work || { in_scope: [], out_of_scope: [], acceptance_criteria: [] };
  base.risks_and_mitigation = Array.isArray(base.risks_and_mitigation) ? base.risks_and_mitigation : [];
  base.milestones = Array.isArray(base.milestones) ? base.milestones : [];
  base.best_recommendation = base.best_recommendation || { approach: "", why: "", starting_package: { name: "", scope_summary: "", estimated_budget: "", estimated_timeline: "" } };
  base.kickoff_email = typeof base.kickoff_email === "string" ? base.kickoff_email : "";

  return base as CoreReport;
}

// version helpers
export function getReportVersion(report: any): string {
  if (!report) return "v1";
  return report.report_version || "v1";
}

export function isV2Report(report: any): boolean {
  if (!report) return false;
  return getReportVersion(report) === "v2";
}

export function getCoreReport(report: any): CoreReport | null {
  if (!report) return null;
  if (isV2Report(report) && report.core_report_json) {
    return report.core_report_json as CoreReport;
  }
  return normalizeLegacyReport(report);
}