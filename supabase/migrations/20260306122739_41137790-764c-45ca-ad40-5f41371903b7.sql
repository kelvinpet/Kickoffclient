
-- Remove the insecure "Anyone can insert submissions" policy
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.submissions;
