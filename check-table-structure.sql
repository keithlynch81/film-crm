-- Check what columns actually exist in notifications table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Also check what data is in the table
SELECT * FROM notifications LIMIT 5;