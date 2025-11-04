-- Make mandates global across all workspaces
-- This allows all users to see all mandates regardless of workspace

-- Step 1: Make workspace_id nullable (it's currently NOT NULL)
ALTER TABLE mandates ALTER COLUMN workspace_id DROP NOT NULL;

-- Step 2: Update RLS policy to allow all authenticated users to view mandates
DROP POLICY IF EXISTS "workspace_members_mandates" ON mandates;

-- New policy: All authenticated users can view all mandates
CREATE POLICY "all_users_view_mandates" ON mandates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins (keith@arecibomedia.com) can insert/update/delete mandates
CREATE POLICY "admin_manage_mandates" ON mandates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'keith@arecibomedia.com'
    )
  );
