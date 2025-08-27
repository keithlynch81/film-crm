-- Debug workspace and RLS issues
-- Run this to see what's happening

-- Check if workspaces were created
SELECT 'Workspaces in database:' as info;
SELECT id, name, created_at FROM public.workspaces;

-- Check if workspace members were created
SELECT 'Workspace members in database:' as info;
SELECT workspace_id, user_id, role FROM public.workspace_members;

-- Check your user ID
SELECT 'Your user details:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'keith@arecibomedia.com';

-- Test the RLS policy manually
SELECT 'Testing RLS - workspaces you can see:' as info;
SELECT w.id, w.name 
FROM public.workspaces w
WHERE EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = w.id
    AND wm.user_id = auth.uid()
);

-- Check what auth.uid() returns
SELECT 'Current auth.uid():' as info, auth.uid() as current_user_id;