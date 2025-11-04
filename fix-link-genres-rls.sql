-- Fix link_genres RLS policy
-- The issue: "FOR ALL" policy only had USING clause, missing WITH CHECK clause
-- This prevents INSERT operations from working properly

-- Drop the existing policy
DROP POLICY IF EXISTS "workspace_through_link" ON link_genres;

-- Create corrected policy with both USING and WITH CHECK clauses
CREATE POLICY "workspace_through_link" ON link_genres FOR ALL
  USING (EXISTS (
    SELECT 1 FROM links l
    JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
    WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM links l
    JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
    WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
  ));
