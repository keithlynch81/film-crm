-- Temporarily disable RLS on match tables to test if that's causing the issue
-- This will help isolate if the RLS policies are causing the workspace_id ambiguity error

-- Disable RLS temporarily for testing
ALTER TABLE news_contact_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE news_company_matches DISABLE ROW LEVEL SECURITY; 
ALTER TABLE news_project_matches DISABLE ROW LEVEL SECURITY;

-- Comment for restoration later
-- To re-enable:
-- ALTER TABLE news_contact_matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE news_company_matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE news_project_matches ENABLE ROW LEVEL SECURITY;