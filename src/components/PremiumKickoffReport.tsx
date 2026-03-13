function renderText(value: unknown, fallback = "—") {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function renderList(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
  );
}
// ... (keep SectionCard and ScoreBar as they are)

export default function PremiumKickoffReport({ report }: { report: any }) {
  if (!report) return <div className="text-muted-foreground">No report available.</div>;

  // Helper to safely render text or objects
  const renderContent = (content: any) => {
    if (typeof content === "string") return <p>{content}</p>;
    if (Array.isArray(content)) {
      return (
        <ul className="list-disc pl-6">
          {content.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
          ))}
        </ul>
      );
    }
    if (typeof content === "object" && content !== null) {
      // If it's the specific object from your error message:
      return (
        <div className="space-y-2">
          {content.description && <p>{content.description}</p>}
          {content.root_causes && (
            <div>
              <span className="font-semibold text-sm">Root Causes:</span>
              {renderContent(content.root_causes)}
            </div>
          )}
          {content.implications && (
            <div>
              <span className="font-semibold text-sm">Implications:</span>
              {renderContent(content.implications)}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

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

      <SectionCard title="Confirmed Facts">{renderList(confirmed_facts)}</SectionCard>
      <SectionCard title="Assumptions">{renderList(assumptions)}</SectionCard>
      <SectionCard title="Needs Clarification">{renderList(needs_clarification)}</SectionCard>

      <SectionCard title="Problem Diagnosis">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{renderText(problem_diagnosis?.description)}</p>
          {renderList(problem_diagnosis?.root_causes)}
          {renderList(problem_diagnosis?.implications)}
        </div>
      </SectionCard>

      <SectionCard title="Solution Blueprint">
        <p className="text-sm text-muted-foreground">{renderText(solution_blueprint)}</p>
      </SectionCard>

      <SectionCard title="Scope of Work">
        <div>
          <strong>In Scope:</strong>
          {renderList(scope_of_work?.in_scope)}
        </div>
        <div className="mt-2">
          <strong>Out of Scope:</strong>
          {renderList(scope_of_work?.out_of_scope)}
        </div>
        <div className="mt-2">
          <strong>Acceptance Criteria:</strong>
          {renderList(scope_of_work?.acceptance_criteria)}
        </div>
      </SectionCard>

      <SectionCard title="Budget Analysis">
        <div className="space-y-3">
          <p>{renderText(budget_analysis?.minimum_viable)}</p>
          <p>{renderText(budget_analysis?.recommended)}</p>
          <p>{renderText(budget_analysis?.premium)}</p>
        </div>
      </SectionCard>

      <SectionCard title="Timeline Analysis">
        <div className="space-y-3">
          <p>{renderText(timeline_analysis?.fast_track)}</p>
          <p>{renderText(timeline_analysis?.standard)}</p>
          <p>{renderText(timeline_analysis?.comfortable)}</p>
        </div>
      </SectionCard>

      <SectionCard title="Best Recommendation">
        <div className="space-y-3">
          <p className="text-base font-semibold">{renderText(best_recommendation?.package_name)}</p>
          <p className="text-sm text-muted-foreground">{renderText(best_recommendation?.why_this_is_the_best_first_move)}</p>
          <p className="text-sm">Recommended Starting Package: <span className="font-medium">{renderText(best_recommendation?.recommended_starting_package)}</span></p>
        </div>
      </SectionCard>

      <SectionCard title="MVP Deliverables">{renderList(mvp_deliverables)}</SectionCard>
      <SectionCard title="Timeline">{renderList(timeline)}</SectionCard>
      <SectionCard title="Milestones">{renderList(milestones)}</SectionCard>
      <SectionCard title="Risks & Mitigation">{renderList(risks_and_mitigation)}</SectionCard>
      <SectionCard title="Implementation Notes">{renderList(implementation_notes)}</SectionCard>
      <SectionCard title="Follow Up Questions">{renderList(follow_up_questions)}</SectionCard>
      <SectionCard title="Kickoff Email">
        <div className="whitespace-pre-line bg-muted/30 p-3 rounded-md border text-sm">{renderText(kickoff_email)}</div>
      </SectionCard>
      <SectionCard title="Score">
        <ScoreBar score={score?.clarity ?? 0} label="Clarity" />
        <ScoreBar score={score?.scope_risk ?? 0} label="Scope Risk" />
        <ScoreBar score={score?.budget_realism ?? 0} label="Budget Realism" />
        <ScoreBar score={score?.timeline_realism ?? 0} label="Timeline Realism" />
      </SectionCard>
      <SectionCard title="Red Flags">{renderList(red_flags)}</SectionCard>
      <SectionCard title="Next Steps">{renderList(next_steps)}</SectionCard>
    </div>
  );
}