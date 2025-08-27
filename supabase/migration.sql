-- Film CRM Supabase Migration
-- DDL + RLS + RPC Implementation

-- Enable RLS
ALTER DATABASE postgres SET row_security = on;

-- Create tables
CREATE TABLE workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE workspace_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'revoked')) DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (workspace_id, email, status)
);

-- Seed reference tables
CREATE TABLE mediums (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE genres (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE budget_ranges (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_value BIGINT,
  max_value BIGINT
);

-- Main business tables
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  logline TEXT,
  status TEXT,
  stage TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  role TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  remit_notes TEXT,
  taste_notes TEXT,
  additional_notes TEXT,
  tags TEXT[]
);

CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  feedback TEXT
);

CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  meeting_type TEXT,
  scheduled_at TIMESTAMPTZ,
  follow_up_due TIMESTAMPTZ,
  notes TEXT
);

-- Junction tables
CREATE TABLE project_genres (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, genre_id)
);

CREATE TABLE project_mediums (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  medium_id INTEGER REFERENCES mediums(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, medium_id)
);

CREATE TABLE project_budget_ranges (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  budget_range_id INTEGER REFERENCES budget_ranges(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, budget_range_id)
);

CREATE TABLE contact_mediums (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  medium_id INTEGER REFERENCES mediums(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, medium_id)
);

CREATE TABLE contact_genres (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, genre_id)
);

CREATE TABLE contact_budget_ranges (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  budget_range_id INTEGER REFERENCES budget_ranges(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, budget_range_id)
);

-- View for current user workspace memberships
CREATE VIEW _current_user_workspace_membership AS
SELECT workspace_id, user_id, role
FROM workspace_members
WHERE user_id = auth.uid();

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_budget_ranges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners/admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

-- Workspace members
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert workspace members"
  ON workspace_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own membership"
  ON workspace_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Owners/admins can manage members"
  ON workspace_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ));

-- Workspace invites
CREATE POLICY "Users can view relevant invites"
  ON workspace_invites FOR SELECT
  USING (
    -- Member of workspace OR inviter OR invitee
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
    OR invited_by = auth.uid()
    OR (status = 'pending' AND LOWER(email) = LOWER(auth.jwt() ->> 'email'))
  );

CREATE POLICY "Owners/admins can manage invites"
  ON workspace_invites FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_invites.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

-- Generic workspace-scoped policies for business tables
CREATE POLICY "workspace_members_select" ON companies FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = companies.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_insert" ON companies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = companies.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_update" ON companies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = companies.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_delete" ON companies FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = companies.workspace_id AND workspace_members.user_id = auth.uid()));

-- Projects
CREATE POLICY "workspace_members_select" ON projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = projects.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_insert" ON projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = projects.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_update" ON projects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = projects.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_delete" ON projects FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = projects.workspace_id AND workspace_members.user_id = auth.uid()));

-- Contacts
CREATE POLICY "workspace_members_select" ON contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = contacts.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_insert" ON contacts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = contacts.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_update" ON contacts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = contacts.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_delete" ON contacts FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = contacts.workspace_id AND workspace_members.user_id = auth.uid()));

-- Submissions
CREATE POLICY "workspace_members_select" ON submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = submissions.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_insert" ON submissions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = submissions.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_update" ON submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = submissions.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_delete" ON submissions FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = submissions.workspace_id AND workspace_members.user_id = auth.uid()));

-- Meetings
CREATE POLICY "workspace_members_select" ON meetings FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = meetings.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_insert" ON meetings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = meetings.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_update" ON meetings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = meetings.workspace_id AND workspace_members.user_id = auth.uid()));

CREATE POLICY "workspace_members_delete" ON meetings FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = meetings.workspace_id AND workspace_members.user_id = auth.uid()));

-- Junction table policies (inherit from parent workspace context)
CREATE POLICY "workspace_through_project" ON project_genres FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p JOIN workspace_members wm ON p.workspace_id = wm.workspace_id WHERE p.id = project_genres.project_id AND wm.user_id = auth.uid()));

CREATE POLICY "workspace_through_project_mediums" ON project_mediums FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p JOIN workspace_members wm ON p.workspace_id = wm.workspace_id WHERE p.id = project_mediums.project_id AND wm.user_id = auth.uid()));

CREATE POLICY "workspace_through_project_budget_ranges" ON project_budget_ranges FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p JOIN workspace_members wm ON p.workspace_id = wm.workspace_id WHERE p.id = project_budget_ranges.project_id AND wm.user_id = auth.uid()));

CREATE POLICY "workspace_through_contact_mediums" ON contact_mediums FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts c JOIN workspace_members wm ON c.workspace_id = wm.workspace_id WHERE c.id = contact_mediums.contact_id AND wm.user_id = auth.uid()));

CREATE POLICY "workspace_through_contact_genres" ON contact_genres FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts c JOIN workspace_members wm ON c.workspace_id = wm.workspace_id WHERE c.id = contact_genres.contact_id AND wm.user_id = auth.uid()));

CREATE POLICY "workspace_through_contact_budgets" ON contact_budget_ranges FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts c JOIN workspace_members wm ON c.workspace_id = wm.workspace_id WHERE c.id = contact_budget_ranges.contact_id AND wm.user_id = auth.uid()));

-- RPC Functions
CREATE OR REPLACE FUNCTION accept_workspace_invite(invite_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record workspace_invites%ROWTYPE;
  user_email TEXT;
BEGIN
  -- Get current user email
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get invite details
  SELECT * INTO invite_record
  FROM workspace_invites
  WHERE id = invite_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invite not found or already processed');
  END IF;
  
  -- Check email match
  IF LOWER(invite_record.email) != LOWER(user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Invite email does not match current user');
  END IF;
  
  -- Insert workspace membership if not exists
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (invite_record.workspace_id, auth.uid(), invite_record.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  -- Update invite status
  UPDATE workspace_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invite_id;
  
  RETURN json_build_object('success', true, 'workspace_id', invite_record.workspace_id);
END;
$$;

-- Trigger to auto-create Personal workspace on first user sign-up
CREATE OR REPLACE FUNCTION create_personal_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Create Personal workspace
  INSERT INTO workspaces (name) VALUES ('Personal')
  RETURNING id INTO workspace_id;
  
  -- Add user as owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_personal_workspace_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();

-- Seed data
INSERT INTO mediums (name) VALUES
  ('Film'),
  ('TV'),
  ('Streaming'),
  ('Documentary'),
  ('Commercial'),
  ('Music Video');

INSERT INTO genres (name) VALUES
  ('Drama'),
  ('Comedy'),
  ('Horror'),
  ('Thriller'),
  ('Action'),
  ('Romance'),
  ('Sci-Fi'),
  ('Fantasy'),
  ('Documentary'),
  ('Animation');

INSERT INTO budget_ranges (label, unit, min_value, max_value) VALUES
  ('Micro Budget', '$', 0, 50000),
  ('Low Budget', '$', 50001, 500000),
  ('Mid Budget', '$', 500001, 5000000),
  ('High Budget', '$', 5000001, 50000000),
  ('Blockbuster', '$', 50000001, NULL);