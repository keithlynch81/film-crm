-- Adapt Market Intelligence to work with existing notifications system
-- Run this in Supabase SQL Editor

-- Update the notification function to work with existing table structure
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
  contact_id_val UUID;
BEGIN
  -- Get article title
  SELECT title INTO article_title
  FROM news_articles 
  WHERE id = article_id;

  -- Process each contact match
  FOR match_record IN SELECT * FROM jsonb_array_elements(contact_matches)
  LOOP
    contact_id_val := (match_record->>'contact_id')::UUID;
    
    -- Get contact info
    SELECT 
      c.first_name || ' ' || COALESCE(c.last_name, ''),
      c.workspace_id
    INTO contact_name, contact_workspace_id
    FROM contacts c
    WHERE c.id = contact_id_val;

    -- Get all users in this workspace
    SELECT ARRAY_AGG(wm.user_id) INTO workspace_users
    FROM workspace_members wm
    WHERE wm.workspace_id = contact_workspace_id;

    -- Create notification for each user in the workspace using existing structure
    FOREACH user_id IN ARRAY workspace_users
    LOOP
      INSERT INTO notifications (
        workspace_id,
        user_id,
        title,
        message,
        action_type,
        entity_type,
        entity_id,
        entity_title,
        actor_user_id,
        is_read,
        metadata
      ) VALUES (
        contact_workspace_id,
        user_id,
        'Industry News Match',
        contact_name || ' mentioned in: ' || SUBSTRING(article_title, 1, 60) || '...',
        'match',
        'news_article',
        article_id,
        article_title,
        user_id, -- Use the receiving user as actor for automated matches
        false,
        jsonb_build_object(
          'contact_id', contact_id_val,
          'contact_name', contact_name,
          'article_id', article_id,
          'article_title', article_title,
          'match_confidence', (match_record->>'match_confidence')::NUMERIC,
          'matched_text', match_record->>'matched_text',
          'source', 'market_intelligence'
        )
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;