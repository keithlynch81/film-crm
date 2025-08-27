-- Check if any notifications exist
SELECT COUNT(*) as total_notifications FROM notifications;

-- Check recent matches that should have triggered notifications
SELECT 
  ncm.id,
  ncm.created_at,
  c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
  na.title,
  c.workspace_id
FROM news_contact_matches ncm
JOIN contacts c ON c.id = ncm.contact_id
JOIN news_articles na ON na.id = ncm.news_article_id
WHERE ncm.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ncm.created_at DESC;