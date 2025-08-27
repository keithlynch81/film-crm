-- Test the notification trigger manually
-- Run this in Supabase SQL Editor

-- First, let's manually insert a test match to trigger the notification
-- Using the Margot Robbie contact and article we found
INSERT INTO news_contact_matches (
  news_article_id,
  contact_id,
  match_type,
  match_confidence,
  matched_text
) VALUES (
  '29bf86e4-cefc-46de-af9c-84279ad8adc3', -- Article ID
  '381bbefd-96dc-4a36-acaf-4af181ea5ba9', -- Margot Robbie contact ID
  'name_mention',
  0.95,
  'Margot Robbie'
);

-- Now check if a notification was created
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.metadata,
  n.created_at,
  n.workspace_id,
  n.user_id
FROM notifications n
ORDER BY n.created_at DESC
LIMIT 5;