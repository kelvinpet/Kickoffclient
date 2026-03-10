
CREATE TABLE public.paystack_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  paystack_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own transactions" ON public.paystack_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage transactions" ON public.paystack_transactions
  FOR ALL USING (true) WITH CHECK (true);
