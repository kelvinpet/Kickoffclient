
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
    'versions', (SELECT COALESCE(jsonb_agg(row_to_json(pv) ORDER BY pv.version_number DESC), '[]'::jsonb) FROM proposal_versions pv WHERE pv.submission_id = s.id),
    'workspace', (SELECT jsonb_build_object(
      'business_name', w.business_name,
      'logo_url', w.logo_url,
      'brand_color', w.brand_color
    ) FROM workspaces w WHERE w.id = t.workspace_id)
  ) INTO result
  FROM submissions s
  JOIN templates t ON t.id = s.template_id
  WHERE s.portal_token = p_token;
  
  RETURN result;
END;
$function$;
