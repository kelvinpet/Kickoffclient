
DROP POLICY "Service role can manage transactions" ON public.paystack_transactions;

CREATE POLICY "Owners can insert own transactions" ON public.paystack_transactions
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
  );
