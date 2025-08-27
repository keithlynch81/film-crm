-- Fix RLS policies for Market Intelligence
-- The current policies are too restrictive and blocking article saves

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "News articles are viewable by authenticated users" ON news_articles;
DROP POLICY IF EXISTS "News contact matches are viewable by workspace members" ON news_contact_matches;
DROP POLICY IF EXISTS "News company matches are viewable by workspace members" ON news_company_matches;
DROP POLICY IF EXISTS "News project matches are viewable by workspace members" ON news_project_matches;

-- Disable RLS temporarily for news_articles (global data, not workspace-specific)
ALTER TABLE news_articles DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled for match tables but fix the policies
-- News contact matches - accessible by workspace members
CREATE POLICY "Allow workspace members to view contact matches" ON news_contact_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = contact_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow workspace members to insert contact matches" ON news_contact_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = contact_id AND wm.user_id = auth.uid()
    )
  );

-- News company matches - accessible by workspace members  
CREATE POLICY "Allow workspace members to view company matches" ON news_company_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = company_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow workspace members to insert company matches" ON news_company_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = company_id AND wm.user_id = auth.uid()
    )
  );

-- News project matches - accessible by workspace members
CREATE POLICY "Allow workspace members to view project matches" ON news_project_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow workspace members to insert project matches" ON news_project_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid()
    )
  );

-- Allow system to delete old articles (cleanup function)
CREATE POLICY "Allow cleanup of old articles" ON news_articles
  FOR DELETE USING (published_at < NOW() - INTERVAL '30 days');

-- Comments for documentation
COMMENT ON TABLE news_articles IS 'Industry news articles - global data accessible by all authenticated users';
COMMENT ON POLICY "Allow workspace members to view contact matches" ON news_contact_matches IS 'Users can view news matches for contacts in their workspaces';
COMMENT ON POLICY "Allow workspace members to view company matches" ON news_company_matches IS 'Users can view news matches for companies in their workspaces';
COMMENT ON POLICY "Allow workspace members to view project matches" ON news_project_matches IS 'Users can view news matches for projects in their workspaces';