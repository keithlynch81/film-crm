-- Fix project notification system to exclude the user who created the project
-- Run this in Supabase SQL Editor

-- Drop the function if it exists
DROP FUNCTION IF EXISTS create_workspace_notification(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT);

-- Create the function to create notifications for all workspace members EXCEPT the actor
CREATE OR REPLACE FUNCTION create_workspace_notification(
  p_workspace_id UUID,
  p_actor_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_title TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS void AS $$
DECLARE
  member_record RECORD;
BEGIN
  -- Loop through all workspace members EXCEPT the actor
  FOR member_record IN
    SELECT user_id
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id != p_actor_user_id  -- Exclude the user who performed the action
  LOOP
    -- Insert notification for this member
    INSERT INTO notifications (
      workspace_id,
      user_id,
      type,
      title,
      message,
      metadata,
      is_read
    ) VALUES (
      p_workspace_id,
      member_record.user_id,
      p_entity_type || '_' || p_action_type,  -- e.g., 'project_create', 'contact_update'
      p_title,
      p_message,
      jsonb_build_object(
        'entity_type', p_entity_type,
        'entity_id', p_entity_id,
        'entity_title', p_entity_title,
        'action_type', p_action_type,
        'actor_user_id', p_actor_user_id
      ),
      false
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_workspace_notification(UUID, UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Comment
COMMENT ON FUNCTION create_workspace_notification IS 'Creates notifications for all workspace members except the user who performed the action';
