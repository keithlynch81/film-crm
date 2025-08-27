-- Add notifications system for Market Intelligence matches
-- Run this in Supabase SQL Editor

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('market_intelligence_match', 'contact_match', 'company_match', 'project_match')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
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

-- Indexes for performance
CREATE INDEX idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(workspace_id, is_read) WHERE is_read = false;

-- Function to create notifications for new matches
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

-- Create trigger to auto-generate notifications
CREATE TRIGGER trigger_notify_new_matches
  AFTER INSERT ON news_contact_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_matches();

-- Comment
COMMENT ON TABLE notifications IS 'System notifications for users about Market Intelligence matches and other events';
COMMENT ON FUNCTION notify_new_matches() IS 'Auto-creates notifications when new contact matches are found in industry news';