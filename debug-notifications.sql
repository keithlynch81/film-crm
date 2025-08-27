-- Debug notifications system
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_new_matches';

-- 2. Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'notify_new_matches';

-- 3. Check if notifications table has the right structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Check recent contact matches
SELECT 
  ncm.id,
  ncm.contact_id,
  ncm.news_article_id,
  ncm.created_at,
  c.first_name,
  c.last_name,
  na.title
FROM news_contact_matches ncm
JOIN contacts c ON c.id = ncm.contact_id
JOIN news_articles na ON na.id = ncm.news_article_id
ORDER BY ncm.created_at DESC
LIMIT 5;

-- 5. Check if any notifications exist at all
SELECT count(*) as notification_count FROM notifications;

-- 6. Test the trigger manually (this will create a test notification)
-- First, let's see what contact and article IDs we have
SELECT 
  c.id as contact_id,
  c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
  na.id as article_id,
  na.title
FROM contacts c
CROSS JOIN news_articles na
WHERE c.first_name ILIKE '%margot%'
AND na.title ILIKE '%margot%'
LIMIT 1;