CREATE POLICY "Owners can delete submissions"
ON public.submissions
FOR DELETE
TO authenticated
USING (
  template_id IN (
    SELECT t.id FROM templates t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE w.owner_user_id = auth.uid()
  )
);