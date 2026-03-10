
-- Drop deposit columns from submissions
ALTER TABLE public.submissions DROP COLUMN IF EXISTS deposit_payment_link;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS deposit_status;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS deposit_amount;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS deposit_paid_at;

-- Update the status validation function to use scope_locked instead of deposit_paid
CREATE OR REPLACE FUNCTION public.update_submission_status(p_token text, p_status text, p_comment text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_status NOT IN ('pending', 'approved', 'needs_changes', 'scope_locked', 'project_started') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;
  
  UPDATE submissions
  SET status = p_status, 
      status_comment = COALESCE(p_comment, status_comment),
      approved_at = CASE WHEN p_status = 'approved' AND approved_at IS NULL THEN now() ELSE approved_at END,
      client_change_request = CASE WHEN p_status = 'needs_changes' THEN p_comment ELSE client_change_request END
  WHERE portal_token = p_token;
  
  RETURN FOUND;
END;
$function$;

-- Update any existing deposit_paid statuses to scope_locked
UPDATE public.submissions SET status = 'scope_locked' WHERE status = 'deposit_paid';
