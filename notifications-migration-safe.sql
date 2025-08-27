-- Safe notifications migration - only adds missing pieces
-- Run this in Supabase SQL Editor

-- Check if notifications table exists and add missing columns if needed
DO $$ 
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Users can view their workspace notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- Create policies
CREATE POLICY "Users can view their workspace notifications" ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = notifications.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications" ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = notifications.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id, is_read) WHERE is_read = false;

-- Drop and recreate the function to ensure it's up to date
DROP FUNCTION IF EXISTS notify_new_matches();

CREATE OR REPLACE FUNCTION notify_new_matches()
RETURNS TRIGGER AS $$
DECLARE
  contact_name TEXT;
  article_title TEXT;
  workspace_ids UUID[];
  workspace_id UUID;
  workspace_users UUID[];
  user_id UUID;
BEGIN
  -- Get contact name and article title
  SELECT 
    c.first_name || ' ' || COALESCE(c.last_name, ''),
    na.title,
    ARRAY_AGG(DISTINCT c.workspace_id)
  INTO contact_name, article_title, workspace_ids
  FROM contacts c
  JOIN news_articles na ON na.id = NEW.news_article_id
  WHERE c.id = NEW.contact_id
  GROUP BY c.first_name, c.last_name, na.title;

  -- Create notifications for all workspace members
  FOREACH workspace_id IN ARRAY workspace_ids
  LOOP
    -- Get all users in this workspace
    SELECT ARRAY_AGG(wm.user_id) INTO workspace_users
    FROM workspace_members wm
    WHERE wm.workspace_id = workspace_id;

    -- Create notification for each user
    FOREACH user_id IN ARRAY workspace_users
    LOOP
      INSERT INTO notifications (
        workspace_id,
        user_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        workspace_id,
        user_id,
        'market_intelligence_match',
        'New Industry News Match',
        contact_name || ' mentioned in: ' || article_title,
        jsonb_build_object(
          'contact_id', NEW.contact_id,
          'contact_name', contact_name,
          'article_id', NEW.news_article_id,
          'article_title', article_title,
          'match_confidence', NEW.match_confidence,
          'matched_text', NEW.matched_text
        )
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_new_matches ON news_contact_matches;

CREATE TRIGGER trigger_notify_new_matches
  AFTER INSERT ON news_contact_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_matches();

-- Test that everything is working
SELECT 'Notifications system setup complete!' as status;