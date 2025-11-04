-- Fix mandates RLS policies - Version 2
-- Drop the old policy that's causing permission denied errors
DROP POLICY IF EXISTS "admin_manage_mandates" ON mandates;
DROP POLICY IF EXISTS "all_users_view_mandates" ON mandates;
DROP POLICY IF EXISTS "workspace_members_mandates" ON mandates;

-- Make workspace_id nullable if not already
ALTER TABLE mandates ALTER COLUMN workspace_id DROP NOT NULL;

-- Simple policy: All authenticated users can view all mandates
CREATE POLICY "all_authenticated_view_mandates" ON mandates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only keith@arecibomedia.com can insert/update/delete
-- Use auth.jwt() to check email from the token (no need to query users table)
CREATE POLICY "admin_manage_mandates_v2" ON mandates
  FOR ALL
  USING (
    (auth.jwt() ->> 'email') = 'keith@arecibomedia.com'
  );

-- Verify RLS is enabled
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
