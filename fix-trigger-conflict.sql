-- Fix trigger conflict causing workspace_id ambiguity error
-- The existing trigger is conflicting with manual notification creation

-- Drop the problematic trigger since notifications are now created manually
DROP TRIGGER IF EXISTS trigger_notify_new_matches ON news_contact_matches;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS notify_new_matches();

-- Re-enable RLS on match tables now that the trigger conflict is resolved
ALTER TABLE news_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_company_matches ENABLE ROW LEVEL SECURITY; 
ALTER TABLE news_project_matches ENABLE ROW LEVEL SECURITY;