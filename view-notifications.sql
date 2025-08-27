-- View the existing notifications
SELECT 
  id,
  type,
  title,
  message,
  is_read,
  created_at,
  metadata
FROM notifications 
ORDER BY created_at DESC;