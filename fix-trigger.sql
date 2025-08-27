-- Fix the Personal workspace creation trigger
-- Run this in your Supabase SQL Editor

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS create_personal_workspace_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_personal_workspace();

-- Create improved function
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Create Personal workspace
  INSERT INTO public.workspaces (name) 
  VALUES ('Personal')
  RETURNING id INTO workspace_id;
  
  -- Add user as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create personal workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_personal_workspace_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();

-- Also grant necessary permissions to the trigger function
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.workspaces TO anon, authenticated;
GRANT INSERT ON public.workspace_members TO anon, authenticated;