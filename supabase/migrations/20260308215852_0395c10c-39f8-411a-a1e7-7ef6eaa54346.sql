CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  notify_new_submission boolean NOT NULL DEFAULT true,
  notify_client_approval boolean NOT NULL DEFAULT true,
  notify_change_request boolean NOT NULL DEFAULT true,
  notify_deposit_paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));