// Shared types for AI-generated kickoff reports

export type CoreReport = {
  confirmed_facts: string[];
  assumptions: string[];
  needs_clarification: string[];
  executive_summary: string;
  problem_diagnosis: {
    description: string;
    root_causes: string[];
    implications: string;
  };
  solution_blueprint: {
    phases: Array<{
      name: string;
      deliverables: string[];
      duration: string;
    }>;
    tools_and_stack: string[];
    assumptions: string[];
    constraints: string[];
  };
  scope_doc: {
    in_scope: string[];
    out_of_scope: string[];
    acceptance_criteria: string[];
  };
  timeline: {
    overview: string;
    breakdown: Array<{
      period: string;
      activities: string;
      dependencies: string;
    }>;
    delay_risks: string;
  };
  milestones: Array<{
    name: string;
    output: string;
    signoff: string;
  }>;
  risks: Array<{
    risk: string;
    severity: string;
    likelihood: string;
    mitigation: string;
  }>;
  missing_info: {
    business_goals: string[];
    users_audience: string[];
    content_assets: string[];
    branding: string[];
    technical: string[];
    compliance_legal: string[];
    budget_timeline: string[];
  };
  suggested_budget: {
    analysis: string;
    what_is_possible: string;
    what_is_not_possible: string;
    minimum_viable: string;
    recommended: string;
    premium: string;
    currency_note: string;
    strategic_allocation: string;
  };
  suggested_timeline: {
    analysis: string;
    what_is_possible: string;
    what_should_be_deferred: string;
    realistic_timeline: string;
    fast_track: {
      duration: string;
      tradeoffs: string;
    };
    standard: {
      duration: string;
      description: string;
    };
    comfortable: {
      duration: string;
      description: string;
    };
    key_dependencies: string[];
  };
  mvp_adjustment: {
    recommended: boolean;
    reduced_scope: string[];
    deferred_features: string[];
    mvp_budget: string;
    mvp_timeline: string;
    rationale: string;
  };
  best_recommendation: {
    approach: string;
    why: string;
    starting_package: {
      name: string;
      scope_summary: string;
      estimated_budget: string;
      estimated_timeline: string;
    };
  };
  negotiation_script: string[];
  kickoff_iq_score: {
    clarity_score: number;
    clarity_explanation: string;
    scope_risk_score: number;
    scope_risk_explanation: string;
    budget_realism_score: number;
    budget_realism_explanation: string;
    timeline_realism_score: number;
    timeline_realism_explanation: string;
    red_flags: string[];
    next_best_actions: string[];
  };
  next_step_recommendation: {
    summary: string;
  };
};

export type ProposalData = {
  title: string;
  client_name: string;
  company_name: string;
  business_name: string;
  generated_at: string;
  sections: Array<{
    title: string;
    content: string | string[] | Record<string, unknown>;
  }>;
};

export type PricingPageData = {
  packages: Array<{
    name: string;
    scope_summary: string;
    budget: string;
    timeline: string;
    recommended?: boolean;
  }>;
};

export type AiReportRow = {
  id: string;
  submission_id: string;
  core_report_json?: CoreReport;
  summary?: string;
  risks?: any[];
  timeline?: string;
  milestones?: any[];
  missing_info?: any;
  scope_doc?: any;
  kickoff_email?: string;
  proposal_json?: ProposalData;
  pricing_page_json?: PricingPageData;
  report_version: string;
  generated_at: string;
  updated_at: string;
  email_generated_at?: string;
  proposal_generated_at?: string;
  pricing_generated_at?: string;
};
