-- Fix notifications for service role operations
-- Run this in Supabase SQL Editor

-- Create function to manually trigger notifications (since service role bypasses triggers)
CREATE OR REPLACE FUNCTION notify_contact_matches(
  article_id UUID,
  contact_matches JSONB
)
RETURNS void AS $$
DECLARE
  match_record JSONB;
  contact_name TEXT;
  article_title TEXT;
  contact_workspace_id UUID;
  workspace_users UUID[];
  user_id UUID;
BEGIN
  -- Get article title
  SELECT title INTO article_title
  FROM news_articles 
  WHERE id = article_id;

  -- Process each contact match
  FOR match_record IN SELECT * FROM jsonb_array_elements(contact_matches)
  LOOP
    -- Get contact info
    SELECT 
      c.first_name || ' ' || COALESCE(c.last_name, ''),
      c.workspace_id
    INTO contact_name, contact_workspace_id
    FROM contacts c
    WHERE c.id = (match_record->>'contact_id')::UUID;

    -- Get all users in this workspace
    SELECT ARRAY_AGG(wm.user_id) INTO workspace_users
    FROM workspace_members wm
    WHERE wm.workspace_id = contact_workspace_id;

    -- Create notification for each user in the workspace
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
        contact_workspace_id,
        user_id,
        'market_intelligence_match',
        'New Industry News Match',
        contact_name || ' mentioned in: ' || article_title,
        jsonb_build_object(
          'contact_id', (match_record->>'contact_id')::UUID,
          'contact_name', contact_name,
          'article_id', article_id,
          'article_title', article_title,
          'match_confidence', (match_record->>'match_confidence')::NUMERIC,
          'matched_text', match_record->>'matched_text'
        )
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;