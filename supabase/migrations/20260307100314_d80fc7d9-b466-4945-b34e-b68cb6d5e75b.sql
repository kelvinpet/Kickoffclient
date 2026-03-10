
CREATE TABLE public.proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_change_order boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(submission_id, version_number)
);

ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage proposal versions"
ON public.proposal_versions
FOR ALL
TO authenticated
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN templates t ON t.id = s.template_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE w.owner_user_id = auth.uid()
  )
);

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS approved_version_id uuid;
