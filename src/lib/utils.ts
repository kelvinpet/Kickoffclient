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
  if (typeof str !== "string") return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Basic runtime check that an object resembles a CoreReport.
 * It only verifies a couple of required keys rather than full schema.
 */
export function isValidCoreReportShape(obj: any): obj is CoreReport {
  if (!obj || typeof obj !== "object") return false;
  return typeof obj.executive_summary === "string" && typeof obj.problem_diagnosis === "object";
}

/**
 * Normalize an existing ai_reports row into a complete CoreReport object.
 * - If core_report_json exists and looks valid, return it directly.
 * - Otherwise, attempt to synthesize a report from legacy fields.
 * This function must never throw; callers can safely run it on arbitrary rows.
 */
export function normalizeLegacyReport(report: any): CoreReport {
  if (report.core_report_json && isValidCoreReportShape(report.core_report_json)) {
    return report.core_report_json as CoreReport;
  }

  let parsed: any = null;
  if (report.summary) {
    parsed = safeJsonParse(report.summary);
  }
  const base: any = parsed && isValidCoreReportShape(parsed) ? parsed : {};

  // copy over simple legacy columns
  if (!base.missing_info && report.missing_info) {
    base.missing_info = Array.isArray(report.missing_info)
      ? { business_goals: report.missing_info, users_audience: [], content_assets: [], branding: [], technical: [], compliance_legal: [], budget_timeline: [] }
      : report.missing_info;
  }
  if (!base.risks && report.risks) {
    base.risks = report.risks;
  }
  if (!base.timeline && report.timeline) {
    base.timeline = { overview: report.timeline, breakdown: [], delay_risks: "" };
  }
  if (!base.milestones && report.milestones) {
    base.milestones = report.milestones;
  }
  if (!base.scope_doc && report.scope_doc) {
    base.scope_doc = { in_scope: [], out_of_scope: [], acceptance_criteria: [] };
  }

  // ensure required properties exist with defaults
  base.confirmed_facts = base.confirmed_facts || [];
  base.assumptions = base.assumptions || [];
  base.needs_clarification = base.needs_clarification || [];
  base.executive_summary = base.executive_summary || report.summary || "";
  base.problem_diagnosis = base.problem_diagnosis || { description: "", root_causes: [], implications: "" };
  base.solution_blueprint = base.solution_blueprint || { phases: [], tools_and_stack: [], assumptions: [], constraints: [] };
  base.scope_doc = base.scope_doc || { in_scope: [], out_of_scope: [], acceptance_criteria: [] };
  base.timeline = base.timeline || { overview: "", breakdown: [], delay_risks: "" };
  base.milestones = base.milestones || [];
  base.risks = base.risks || [];
  base.missing_info = base.missing_info || { business_goals: [], users_audience: [], content_assets: [], branding: [], technical: [], compliance_legal: [], budget_timeline: [] };
  base.suggested_budget = base.suggested_budget || {
    analysis: "",
    what_is_possible: "",
    what_is_not_possible: "",
    minimum_viable: "",
    recommended: "",
    premium: "",
    currency_note: "",
    strategic_allocation: "",
  };
  base.suggested_timeline = base.suggested_timeline || {
    analysis: "",
    what_is_possible: "",
    what_should_be_deferred: "",
    realistic_timeline: "",
    fast_track: { duration: "", tradeoffs: "" },
    standard: { duration: "", description: "" },
    comfortable: { duration: "", description: "" },
    key_dependencies: [],
  };
  base.mvp_adjustment = base.mvp_adjustment || { recommended: false, reduced_scope: [], deferred_features: [], mvp_budget: "", mvp_timeline: "", rationale: "" };
  base.best_recommendation = base.best_recommendation || { approach: "", why: "", starting_package: { name: "", scope_summary: "", estimated_budget: "", estimated_timeline: "" } };
  base.negotiation_script = base.negotiation_script || [];
  base.kickoff_iq_score = base.kickoff_iq_score || { clarity_score: 0, clarity_explanation: "", scope_risk_score: 0, scope_risk_explanation: "", budget_realism_score: 0, budget_realism_explanation: "", timeline_realism_score: 0, timeline_realism_explanation: "", red_flags: [], next_best_actions: [] };
  base.next_step_recommendation = base.next_step_recommendation || { summary: report.next_step_recommendation || "" };

  return base as CoreReport;
}

// version helpers
export function getReportVersion(report: any): string {
  return report.report_version || "v1";
}

export function isV2Report(report: any): boolean {
  return getReportVersion(report) === "v2";
}

export function getCoreReport(report: any): CoreReport {
  if (isV2Report(report) && report.core_report_json) {
    return report.core_report_json as CoreReport;
  }
  return normalizeLegacyReport(report);
}

