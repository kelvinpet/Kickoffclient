-- remove Paystack-specific schema

-- drop transactions table
DROP TABLE IF EXISTS public.paystack_transactions;

-- remove paystack columns from subscriptions
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS paystack_customer_code,
  DROP COLUMN IF EXISTS paystack_email_token,
  DROP COLUMN IF EXISTS paystack_plan_code,
  DROP COLUMN IF EXISTS paystack_subscription_code;

-- remove paystack column from workspaces
ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS paystack_plan_code;

-- optionally clear provider default if it was paystack
ALTER TABLE public.subscriptions
  ALTER COLUMN provider DROP DEFAULT;

-- remove any policies referencing paystack_transactions were dropped with table

