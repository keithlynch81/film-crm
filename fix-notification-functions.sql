-- Fix missing notification functions for red badge count display
-- This creates the table and functions that NotificationDropdown.tsx expects

-- First, create the notification_read_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- RLS policies for notification_read_status
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own read status" ON notification_read_status;
DROP POLICY IF EXISTS "Users can insert their own read status" ON notification_read_status;
DROP POLICY IF EXISTS "Users can update their own read status" ON notification_read_status;

CREATE POLICY "Users can view their own read status" ON notification_read_status
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read status" ON notification_read_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status" ON notification_read_status
  FOR UPDATE USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notification_read_status_user_notification 
  ON notification_read_status(user_id, notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification 
  ON notification_read_status(notification_id);

-- Function to get unread notification count for a workspace
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_workspace_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_user_id UUID := auth.uid();
  unread_count INTEGER := 0;
BEGIN
  -- Count notifications that haven't been read by the current user
  -- For shared notifications (user_id IS NULL), check if user has read them
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM notifications n
  WHERE n.workspace_id = p_workspace_id
    AND NOT EXISTS (
      SELECT 1 FROM notification_read_status nrs 
      WHERE nrs.notification_id = n.id 
        AND nrs.user_id = current_user_id
    );
    
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the mark_notification_read function to match what the UI expects
-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  workspace_uuid UUID;
BEGIN
  -- Get the workspace_id for this notification
  SELECT workspace_id INTO workspace_uuid 
  FROM notifications 
  WHERE id = notification_id;
  
  IF workspace_uuid IS NULL THEN
    RAISE EXCEPTION 'Notification not found or access denied';
  END IF;
  
  -- Mark as read by inserting/updating read status
  INSERT INTO notification_read_status (notification_id, user_id, workspace_id)
  VALUES (notification_id, current_user_id, workspace_uuid)
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a workspace
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_workspace_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  notification_record RECORD;
BEGIN
  -- Mark all notifications in workspace as read for current user
  FOR notification_record IN 
    SELECT id FROM notifications WHERE workspace_id = p_workspace_id
  LOOP
    INSERT INTO notification_read_status (notification_id, user_id, workspace_id)
    VALUES (notification_record.id, current_user_id, p_workspace_id)
    ON CONFLICT (notification_id, user_id) 
    DO UPDATE SET read_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for a workspace for the current user';
COMMENT ON FUNCTION mark_notification_read IS 'Mark a specific notification as read by the current user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all notifications in a workspace as read by the current user';