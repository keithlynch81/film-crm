-- Check what's happening with your user and workspace
-- Make sure you're logged into the app when running this

-- First, let's see if auth.uid() works now
SELECT 'Current auth.uid():' as info, auth.uid() as user_id;

-- Check if your user exists and get the ID
SELECT 'User lookup:' as info, id, email, created_at 
FROM auth.users 
WHERE email = 'keith@arecibomedia.com';

-- Check all workspaces in the database
SELECT 'All workspaces:' as info, id, name, created_at 
FROM public.workspaces;

-- Check all workspace members
SELECT 'All workspace members:' as info, workspace_id, user_id, role 
FROM public.workspace_members;

-- Test if the current user can see workspaces (this should work if RLS is correct)
SELECT 'Workspaces visible to current user:' as info, w.id, w.name
FROM public.workspaces w
JOIN public.workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();