-- Create Personal workspace for existing user
-- Replace 'keith@arecibomedia.com' with your actual email if different

DO $$
DECLARE
    user_uuid UUID;
    workspace_uuid UUID;
BEGIN
    -- Get the user ID for your email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'keith@arecibomedia.com';
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not found with email keith@arecibomedia.com';
    END IF;
    
    -- Create Personal workspace
    INSERT INTO public.workspaces (name) 
    VALUES ('Personal')
    RETURNING id INTO workspace_uuid;
    
    -- Add user as owner
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_uuid, user_uuid, 'owner');
    
    RAISE NOTICE 'Created workspace % for user %', workspace_uuid, user_uuid;
END
$$;