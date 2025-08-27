-- Create user-specific read tracking for shared notifications
-- This allows one notification per contact while tracking individual read status

-- Table to track which users have read which notifications
CREATE TABLE IF NOT EXISTS notification_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- RLS policies
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

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

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS is_notification_read_by_user(UUID, UUID);
DROP FUNCTION IF EXISTS is_notification_read_by_user;

-- Function to check if a notification has been read by a specific user
CREATE FUNCTION is_notification_read_by_user(notification_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM notification_read_status 
    WHERE notification_id = notification_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists (with any signature)
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
DROP FUNCTION IF EXISTS mark_notification_read;

-- Function to mark a notification as read by a user
CREATE FUNCTION mark_notification_read(notification_uuid UUID, user_uuid UUID, workspace_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_read_status (notification_id, user_id, workspace_id)
  VALUES (notification_uuid, user_uuid, workspace_uuid)
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE notification_read_status IS 'Tracks individual user read status for shared notifications';
COMMENT ON FUNCTION is_notification_read_by_user IS 'Check if a specific user has read a notification';
COMMENT ON FUNCTION mark_notification_read IS 'Mark a notification as read by a specific user';