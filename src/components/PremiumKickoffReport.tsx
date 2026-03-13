import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- Sub-components for UI Consistency ---

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-primary" : score >= 40 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="space-y-1 mb-4">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div 
          className={`h-2 rounded-full ${color} transition-all duration-500`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}

// --- Enhanced Rendering Helpers ---


// Enhanced renderText: if value is object, return value.description, value.analysis, or value.overview
function renderText(value: unknown, fallback = "Consultant to provide details") {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const v = value as any;
    const text = v.description || v.analysis || v.overview || v.summary || v.approach || v.why || v.duration;
    if (typeof text === "string" && text.trim()) return text;
  }
  return fallback;
}

// Enhanced renderList: if input is object with array (like { phases: [] }), extract array automatically
function renderList(items: unknown) {
  let list: any[] = [];
  if (Array.isArray(items)) {
    list = items;
  } else if (items && typeof items === "object") {
    // Try to extract the first array property from the object
    const v = items as any;
    const arrayProp = Object.values(v).find((val) => Array.isArray(val));
    list = Array.isArray(arrayProp) ? arrayProp : [];
  }
  if (!list || list.length === 0) {
    return <p className="text-sm text-muted-foreground">Consultant to provide details</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {list.map((item, index) => (
        <li key={index}>
          {typeof item === "string"
            ? item
            : (item?.name || item?.risk || item?.deliverable || item?.activity || JSON.stringify(item))}
        </li>
      ))}
    </ul>
  );
}

export default function PremiumKickoffReport({ report }: { report: any }) {
  if (!report) return <div className="text-muted-foreground">No report available.</div>;

  const {
    confirmed_facts,
    assumptions,
    needs_clarification,
    executive_summary,
    problem_diagnosis,
    solution_blueprint,
    scope_of_work,
    budget_analysis,
    timeline_analysis,
    best_recommendation,
    mvp_deliverables,
    timeline,
    milestones,
    risks_and_mitigation,
    implementation_notes,
    follow_up_questions,
    kickoff_email,
    score,
    red_flags,
    next_steps,
  } = report;

  return (
    <div className="space-y-4">
      <SectionCard title="Executive Summary">
        <p className="text-sm text-muted-foreground">{renderText(executive_summary)}</p>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Confirmed Facts">{renderList(confirmed_facts)}</SectionCard>
        <SectionCard title="Assumptions">{renderList(assumptions)}</SectionCard>
        <SectionCard title="Needs Clarification">{renderList(needs_clarification)}</SectionCard>
      </div>

      <SectionCard title="Problem Diagnosis">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{renderText(problem_diagnosis?.description)}</p>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Root Causes</span>
            {renderList(problem_diagnosis?.root_causes)}
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Implications</span>
            <p className="text-sm text-muted-foreground">{renderText(problem_diagnosis?.implications)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Solution Blueprint">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{renderText(solution_blueprint)}</p>
          {solution_blueprint?.phases && (
             <div className="mt-2">
               {renderList(solution_blueprint.phases)}
             </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Scope of Work">
        <div className="space-y-4">
          <div>
            <strong className="text-sm text-primary">In Scope</strong>
            {renderList(scope_of_work?.in_scope)}
          </div>
          <div>
            <strong className="text-sm text-muted-foreground">Out of Scope</strong>
            {renderList(scope_of_work?.out_of_scope)}
          </div>
          <div>
            <strong className="text-sm font-medium">Acceptance Criteria</strong>
            {renderList(scope_of_work?.acceptance_criteria)}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Budget Analysis">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Minimum Viable:</span> {renderText(budget_analysis?.minimum_viable)}</p>
            <p><span className="font-semibold text-foreground">Recommended:</span> {renderText(budget_analysis?.recommended)}</p>
            <p><span className="font-semibold text-foreground">Premium:</span> {renderText(budget_analysis?.premium)}</p>
          </div>
        </SectionCard>

        <SectionCard title="Timeline Analysis">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Fast Track:</span> {renderText(timeline_analysis?.fast_track)}</p>
            <p><span className="font-semibold text-foreground">Standard:</span> {renderText(timeline_analysis?.standard)}</p>
            <p><span className="font-semibold text-foreground">Comfortable:</span> {renderText(timeline_analysis?.comfortable)}</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Best Recommendation">
        <div className="space-y-2">
          <p className="text-base font-bold text-primary">{renderText(best_recommendation?.package_name || best_recommendation?.approach)}</p>
          <p className="text-sm text-muted-foreground italic">"{renderText(best_recommendation?.why_this_is_the_best_first_move || best_recommendation?.why)}"</p>
          <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Recommended Starting Package</p>
            <p className="text-sm font-medium">{renderText(best_recommendation?.recommended_starting_package || best_recommendation?.starting_package)}</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Milestones">{renderList(milestones)}</SectionCard>
        <SectionCard title="Risks & Mitigation">{renderList(risks_and_mitigation || report.risks)}</SectionCard>
      </div>

      <SectionCard title="Kickoff Email">
        <div className="whitespace-pre-line bg-muted/30 p-4 rounded-md border text-sm italic font-serif">
          {renderText(kickoff_email)}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Project Health Score">
          <ScoreBar score={score?.clarity ?? 0} label="Clarity" />
          <ScoreBar score={score?.scope_risk ?? 0} label="Scope Risk" />
          <ScoreBar score={score?.budget_realism ?? 0} label="Budget Realism" />
          <ScoreBar score={score?.timeline_realism ?? 0} label="Timeline Realism" />
        </SectionCard>
        <SectionCard title="Next Steps & Red Flags">
           <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-destructive uppercase">Red Flags</span>
                {renderList(red_flags)}
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase">Immediate Next Steps</span>
                {renderList(next_steps)}
              </div>
           </div>
        </SectionCard>
      </div>
    </div>
  );
}