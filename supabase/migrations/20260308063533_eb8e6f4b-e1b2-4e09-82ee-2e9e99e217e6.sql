
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS section_feedback jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS followup_answers jsonb DEFAULT '{}'::jsonb;

-- Update the get_submission_by_portal_token function to include proposal versions
CREATE OR REPLACE FUNCTION public.get_submission_by_portal_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'submission', row_to_json(s),
    'template_title', t.title,
    'template_description', t.description,
    'fields', (SELECT COALESCE(jsonb_agg(row_to_json(tf) ORDER BY tf.position), '[]'::jsonb) FROM template_fields tf WHERE tf.template_id = s.template_id),
    'report', (SELECT row_to_json(r) FROM ai_reports r WHERE r.submission_id = s.id ORDER BY r.created_at DESC LIMIT 1),
    'versions', (SELECT COALESCE(jsonb_agg(row_to_json(pv) ORDER BY pv.version_number DESC), '[]'::jsonb) FROM proposal_versions pv WHERE pv.submission_id = s.id)
  ) INTO result
  FROM submissions s
  JOIN templates t ON t.id = s.template_id
  WHERE s.portal_token = p_token;
  
  RETURN result;
END;
$function$;

-- Update update_submission_status to handle section_feedback and followup_answers
CREATE OR REPLACE FUNCTION public.update_submission_status(p_token text, p_status text, p_comment text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Create a function for clients to save section feedback and followup answers
CREATE OR REPLACE FUNCTION public.save_portal_feedback(
  p_token text,
  p_section_feedback jsonb DEFAULT NULL,
  p_followup_answers jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE submissions
  SET 
    section_feedback = COALESCE(p_section_feedback, section_feedback),
    followup_answers = COALESCE(p_followup_answers, followup_answers)
  WHERE portal_token = p_token;
  
  RETURN FOUND;
END;
$function$;
