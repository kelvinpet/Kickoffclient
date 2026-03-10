
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_content text,
  ADD COLUMN IF NOT EXISTS client_change_request text;
