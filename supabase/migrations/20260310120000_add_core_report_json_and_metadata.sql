-- Migration: add structured report storage and versioning
-- This migration introduces a new jsonb column for the canonical
-- report (`core_report_json`) along with supporting metadata and
-- placeholders for secondary outputs. Existing fields remain intact
-- for backward compatibility.

BEGIN;

ALTER TABLE IF EXISTS ai_reports
  ADD COLUMN IF NOT EXISTS core_report_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS proposal_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS pricing_page_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS report_version text NOT NULL DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS email_generated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS proposal_generated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS pricing_generated_at timestamptz NULL;

-- indexes
CREATE INDEX IF NOT EXISTS idx_ai_reports_submission_id ON ai_reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_core_report_json ON ai_reports USING gin(core_report_json);

-- trigger function to update `updated_at`
CREATE OR REPLACE FUNCTION ai_reports_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_reports_updated_at ON ai_reports;
CREATE TRIGGER trg_ai_reports_updated_at
  BEFORE UPDATE ON ai_reports
  FOR EACH ROW
  EXECUTE PROCEDURE ai_reports_set_updated_at();

COMMIT;
