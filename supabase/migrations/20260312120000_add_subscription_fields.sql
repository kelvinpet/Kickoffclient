-- add user_id, expires_at and transaction info to subscriptions for expiration logic

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS tx_ref text,
  ADD COLUMN IF NOT EXISTS transaction_id text;

-- optionally index expires_at for querying
CREATE INDEX IF NOT EXISTS subscriptions_expires_at_idx ON public.subscriptions(expires_at);
