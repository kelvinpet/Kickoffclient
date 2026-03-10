
-- Add portal and status columns to submissions
ALTER TABLE public.submissions 
  ADD COLUMN IF NOT EXISTS portal_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_comment text;

-- Index for fast portal lookups
CREATE INDEX IF NOT EXISTS idx_submissions_portal_token ON public.submissions(portal_token);

-- Security definer function for portal access (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_submission_by_portal_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'submission', row_to_json(s),
    'template_title', t.title,
    'template_description', t.description,
    'fields', (SELECT COALESCE(jsonb_agg(row_to_json(tf) ORDER BY tf.position), '[]'::jsonb) FROM template_fields tf WHERE tf.template_id = s.template_id),
    'report', (SELECT row_to_json(r) FROM ai_reports r WHERE r.submission_id = s.id ORDER BY r.created_at DESC LIMIT 1)
  ) INTO result
  FROM submissions s
  JOIN templates t ON t.id = s.template_id
  WHERE s.portal_token = p_token;
  
  RETURN result;
END;
$$;

-- Function to update submission status from portal
CREATE OR REPLACE FUNCTION public.update_submission_status(p_token text, p_status text, p_comment text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('pending', 'approved', 'needs_changes') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;
  
  UPDATE submissions
  SET status = p_status, status_comment = p_comment
  WHERE portal_token = p_token;
  
  RETURN FOUND;
END;
$$;

-- Server-side submission limit enforcement trigger
CREATE OR REPLACE FUNCTION public.check_submission_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ws_id uuid;
  ws_limit integer;
  ws_plan text;
  current_count integer;
BEGIN
  SELECT w.id, w.monthly_submission_limit, w.plan 
  INTO ws_id, ws_limit, ws_plan
  FROM templates t
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = NEW.template_id;
  
  IF ws_plan = 'pro' THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM submissions s
  JOIN templates t ON t.id = s.template_id
  WHERE t.workspace_id = ws_id
    AND s.created_at >= date_trunc('month', now());
  
  IF current_count >= ws_limit THEN
    RAISE EXCEPTION 'Monthly submission limit reached. Please ask the provider to upgrade their plan.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_submission_limit
BEFORE INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.check_submission_limit();
