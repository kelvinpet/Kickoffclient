-- Add unique constraints to payments and subscriptions tables

-- For payments table: ensure tx_ref is unique
ALTER TABLE public.payments ADD CONSTRAINT payments_tx_ref_unique UNIQUE (tx_ref);

-- For subscriptions table: ensure workspace_id is unique (one subscription per workspace)
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_workspace_id_unique UNIQUE (workspace_id);