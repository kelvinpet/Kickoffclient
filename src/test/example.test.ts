import { describe, it, expect } from "vitest";

import { describe, it, expect } from "vitest";
import { getMergedAnswers, getClientIdentity, normalizeSubmission, normalizeLegacyReport, isValidCoreReportShape, getReportVersion, getCoreReport } from "@/lib/utils";

describe("helper utilities", () => {
  it("merges original and follow-up answers with followup taking precedence", () => {
    const submission = {
      answers: { a: 1, b: 2 },
      followup_answers: { b: "override", c: 3 },
    };
    expect(getMergedAnswers(submission)).toEqual({ a: 1, b: "override", c: 3 });
  });

  it("extracts name/email using fallback order", () => {
    const submission = {
      answers: { "Full Name": "Alice", Email: "a@x.com" },
      followup_answers: { "Client Full Name": "Bob" },
      client_name: "Charlie",
      client_email: "c@x.com",
    };
    const { name, email } = getClientIdentity(submission);
    expect(name).toBe("Bob"); // client full name from follow-up wins
    expect(email).toBe("a@x.com"); // original Email field
  });

  it("normalizes submission with follow-up questions from structured report", () => {
    const submission = { answers: { foo: 1 }, followup_answers: { q_0: "bar" } };
    const structured = { missing_info: ["What color is the sky?"] };
    const norm = normalizeSubmission(submission, structured as any);
    expect(norm.mergedAnswers).toEqual({ foo: 1, q_0: "bar" });
    expect(norm.followupQuestions).toEqual(["What color is the sky?"]);
  });

  it("validates and normalizes a legacy report", () => {
    const legacy = {
      summary: JSON.stringify({ executive_summary: "hello", problem_diagnosis: { description: "d", root_causes: [], implications: "" } }),
      risks: ["r1"],
      timeline: "t",
      milestones: ["m1"],
      missing_info: ["q1"],
    } as any;
    const core = normalizeLegacyReport(legacy);
    expect(isValidCoreReportShape(core)).toBe(true);
    expect(core.executive_summary).toBe("hello");
    expect(core.risks).toEqual(["r1"]);

    // getReportVersion fallback
    expect(getReportVersion({})).toBe("v1");
    expect(getReportVersion({ report_version: "v2" })).toBe("v2");

    // getCoreReport returns normalized object
    const reportWithCore = { report_version: "v2", core_report_json: core };
    expect(getCoreReport(reportWithCore)).toBe(core);
  });
});
