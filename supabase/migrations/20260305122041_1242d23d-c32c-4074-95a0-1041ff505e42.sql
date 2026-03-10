
CREATE OR REPLACE FUNCTION public.update_submission_status(p_token text, p_status text, p_comment text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('pending', 'approved', 'needs_changes', 'deposit_paid', 'project_started') THEN
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
$$;
