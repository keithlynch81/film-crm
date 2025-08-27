-- Allow NULL user_id in notifications table for shared notifications
-- This enables one notification per contact that can be read independently by each user

-- Remove NOT NULL constraint from user_id column
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id is provided OR it's a shared notification
ALTER TABLE notifications ADD CONSTRAINT check_user_or_shared 
CHECK (
  (user_id IS NOT NULL) OR 
  (user_id IS NULL AND action_type = 'match' AND entity_type = 'contact')
);

-- Update RLS policies to handle shared notifications
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create new policies that handle both personal and shared notifications
CREATE POLICY "Users can view personal and workspace shared notifications" ON notifications
  FOR SELECT USING (
    -- Personal notifications
    (user_id = auth.uid()) OR 
    -- Shared notifications in user's workspaces
    (user_id IS NULL AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own personal notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert shared notifications
CREATE POLICY "System can insert shared notifications" ON notifications
  FOR INSERT WITH CHECK (
    -- Personal notifications must belong to the user
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    -- Shared notifications can be inserted by system (service role)
    (user_id IS NULL AND auth.role() = 'service_role')
  );

COMMENT ON CONSTRAINT check_user_or_shared ON notifications IS 'Ensures notifications are either personal (user_id) or shared Market Intelligence (null user_id)';
COMMENT ON POLICY "Users can view personal and workspace shared notifications" ON notifications IS 'Users see personal notifications and shared workspace notifications';