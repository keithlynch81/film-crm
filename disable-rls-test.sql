-- Temporarily disable RLS on workspace_members to test
-- This is just for testing - we'll re-enable it later

-- Disable RLS on workspace_members
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on workspaces for now
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;