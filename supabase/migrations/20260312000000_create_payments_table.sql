-- create payments table for tracking flutterwave transactions

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text,
  tx_ref text UNIQUE,
  transaction_id text UNIQUE,
  payment_method text,
  plan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_tx_ref_idx ON public.payments(tx_ref);

-- row level security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- policies

-- allow authenticated users to read their own rows
CREATE POLICY "Users can read their own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

-- service role can insert or update (used by functions/webhooks)
CREATE POLICY "Service role can manage payments" ON public.payments
  FOR ALL USING (true) WITH CHECK (true);
