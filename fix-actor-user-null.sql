-- Allow NULL actor_user_id for system-generated shared notifications

-- Remove NOT NULL constraint from actor_user_id column
ALTER TABLE notifications ALTER COLUMN actor_user_id DROP NOT NULL;

-- Update the check constraint to allow NULL actor_user_id for shared notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_user_or_shared;

ALTER TABLE notifications ADD CONSTRAINT check_user_or_shared 
CHECK (
  -- Personal notifications must have user_id and can have actor_user_id
  (user_id IS NOT NULL) OR 
  -- Shared notifications have null user_id and actor_user_id for system-generated ones
  (user_id IS NULL AND actor_user_id IS NULL AND action_type = 'match' AND entity_type = 'contact')
);

COMMENT ON CONSTRAINT check_user_or_shared ON notifications IS 'Ensures notifications are either personal or shared system-generated Market Intelligence';