-- Clean up all mandate policies and start fresh
DROP POLICY IF EXISTS "admin_manage_mandates_v2" ON mandates;
DROP POLICY IF EXISTS "admin_only_mandates" ON mandates;
DROP POLICY IF EXISTS "all_authenticated_view_mandates" ON mandates;
DROP POLICY IF EXISTS "workspace_members_mandates" ON mandates;
DROP POLICY IF EXISTS "admin_manage_mandates" ON mandates;
DROP POLICY IF EXISTS "all_users_view_mandates" ON mandates;

-- Make workspace_id nullable
ALTER TABLE mandates ALTER COLUMN workspace_id DROP NOT NULL;

-- Simple policy: All authenticated users can SELECT mandates
CREATE POLICY "mandates_select_all" ON mandates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only keith@arecibomedia.com can INSERT/UPDATE/DELETE
CREATE POLICY "mandates_admin_modify" ON mandates
  FOR ALL
  USING (
    (auth.jwt() ->> 'email') = 'keith@arecibomedia.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'keith@arecibomedia.com'
  );

-- Ensure RLS is enabled
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
