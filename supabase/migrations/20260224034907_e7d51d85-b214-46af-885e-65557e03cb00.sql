
-- Add billing columns to workspaces
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_submission_limit integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS paystack_plan_code text;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  paystack_plan_code text,
  next_payment_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Create workspace_secrets table for storing Paystack secret key securely
CREATE TABLE IF NOT EXISTS public.workspace_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, key_name)
);

ALTER TABLE public.workspace_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own secrets" ON public.workspace_secrets
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
    )
  );
