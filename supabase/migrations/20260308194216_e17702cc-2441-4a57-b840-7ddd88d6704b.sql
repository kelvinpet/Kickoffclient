
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS deposit_payment_link text,
ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none';
