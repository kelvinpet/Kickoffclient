
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_data text NOT NULL,
  ip_address text,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Workspace owners can read signatures
CREATE POLICY "Owners can read signatures"
ON public.contract_signatures
FOR SELECT
TO authenticated
USING (submission_id IN (
  SELECT s.id FROM submissions s
  JOIN templates t ON t.id = s.template_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE w.owner_user_id = auth.uid()
));

-- Public insert for portal signing (no auth required)
CREATE POLICY "Public can insert signatures"
ON public.contract_signatures
FOR INSERT
WITH CHECK (true);

-- Public can read own signature by submission
CREATE POLICY "Public can read signatures"
ON public.contract_signatures
FOR SELECT
USING (true);
