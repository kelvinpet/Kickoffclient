-- extend subscriptions table with all required fields for lifecycle tracking

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'flutterwave',
  ADD COLUMN IF NOT EXISTS tx_ref text,
  ADD COLUMN IF NOT EXISTS transaction_id text;

-- set sensible defaults for existing rows (if any)
UPDATE public.subscriptions
SET billing_cycle = COALESCE(billing_cycle, 'monthly'),
    amount = COALESCE(amount, 0),
    current_period_start = COALESCE(current_period_start, now()),
    current_period_end = COALESCE(current_period_end, expires_at),
    payment_provider = COALESCE(payment_provider, 'flutterwave');

-- analytics views

CREATE OR REPLACE VIEW public.mrr_view AS
SELECT SUM(amount) AS mrr
FROM public.subscriptions
WHERE status = 'active'
  AND billing_cycle = 'monthly';

CREATE OR REPLACE VIEW public.active_subscribers_view AS
SELECT COUNT(*) AS active_count
FROM public.subscriptions
WHERE status = 'active';

-- allow authenticated workspace owners to update their own subscription (cancel, etc.)
CREATE POLICY "Owners can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_user_id = auth.uid()
    )
  );

CREATE OR REPLACE VIEW public.total_revenue_view AS
SELECT SUM(amount) AS total_revenue
FROM public.payments
WHERE status = 'successful';
