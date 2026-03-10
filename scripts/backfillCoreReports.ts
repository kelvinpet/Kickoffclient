/**
 * Utility script to backfill ai_reports.core_report_json for legacy rows.
 * Usage: ts-node scripts/backfillCoreReports.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { normalizeLegacyReport } from "../src/lib/utils";

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data: rows, error } = await supabase
    .from("ai_reports")
    .select("id, submission_id, core_report_json, summary, missing_info, risks, timeline, milestones, scope_doc, kickoff_email")
    .limit(1000);

  if (error) {
    console.error("Failed to fetch reports:", error);
    process.exit(1);
  }

  for (const r of rows || []) {
    if (r.core_report_json && Object.keys(r.core_report_json).length > 0) continue;

    let normalized;
    try {
      normalized = normalizeLegacyReport(r);
    } catch (e) {
      console.warn(`could not normalize report id=${r.id}:`, e);
      continue;
    }

    const { error: updErr } = await supabase
      .from("ai_reports")
      .update({ core_report_json: normalized })
      .eq("id", r.id);

    if (updErr) {
      console.error(`failed to update report ${r.id}:`, updErr);
    } else {
      console.log(`updated report ${r.id}`);
    }
  }

  console.log("backfill complete");
}

main().catch(console.error);