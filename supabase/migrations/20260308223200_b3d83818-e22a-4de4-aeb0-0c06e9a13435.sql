
CREATE TABLE public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  reminder_type text NOT NULL DEFAULT 'followup',
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read reminder logs"
ON public.reminder_logs
FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

CREATE POLICY "Service can insert reminder logs"
ON public.reminder_logs
FOR INSERT
WITH CHECK (true);
