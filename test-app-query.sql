-- Test the exact query the app is running
-- Replace the user_id with your actual ID: 042482f2-9cfd-4495-9b56-82c62d7defad

SELECT 
  workspace_id,
  role,
  workspaces.id,
  workspaces.name
FROM workspace_members
LEFT JOIN workspaces ON workspace_members.workspace_id = workspaces.id
WHERE workspace_members.user_id = '042482f2-9cfd-4495-9b56-82c62d7defad';