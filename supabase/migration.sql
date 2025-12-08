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
-- ============================================================================
-- ADDITIONAL MIGRATIONS - Added to consolidate all schema changes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Meeting Link Column
-- Add meeting_link field to meetings table for storing Zoom/Meet links
-- ----------------------------------------------------------------------------
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- ----------------------------------------------------------------------------
-- 2. Project Pinning
-- Allow users to pin important projects to the top of their project list
-- ----------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projects_pinned ON projects(workspace_id, pinned DESC, created_at DESC);
COMMENT ON COLUMN projects.pinned IS 'Whether this project is pinned to the top of the project list';

-- ----------------------------------------------------------------------------
-- 3. Contact Talking Points
-- Many-to-many relationship between contacts and projects for meeting prep
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_talking_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, project_id)
);

ALTER TABLE contact_talking_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access talking points in their workspace" ON contact_talking_points
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_contact_talking_points_contact_id ON contact_talking_points(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_talking_points_project_id ON contact_talking_points(project_id);
CREATE INDEX IF NOT EXISTS idx_contact_talking_points_workspace_id ON contact_talking_points(workspace_id);

-- ----------------------------------------------------------------------------
-- 4. Tasks Table
-- Complete task management system with priorities, statuses, and dates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  target_date DATE,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  status TEXT NOT NULL DEFAULT 'Outstanding' CHECK (status IN ('Outstanding', 'In Process', 'Completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_date ON tasks(workspace_id, priority, target_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their workspace" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in their workspace" ON tasks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspace" ON tasks
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their workspace" ON tasks
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

COMMENT ON TABLE tasks IS 'Task management system for tracking to-do items, optionally linked to projects and contacts';
COMMENT ON COLUMN tasks.heading IS 'Brief task title/heading';
COMMENT ON COLUMN tasks.description IS 'Detailed task information';
COMMENT ON COLUMN tasks.priority IS 'Priority level from 1 (highest) to 5 (lowest)';
COMMENT ON COLUMN tasks.status IS 'Current status: Outstanding, In Process, or Completed';
COMMENT ON COLUMN tasks.target_date IS 'Target completion date for the task';

-- ----------------------------------------------------------------------------
-- 5. Task-Contact Junction Table
-- Many-to-many relationship allowing tasks to link to multiple contacts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_task_contacts_task_id ON task_contacts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_contacts_contact_id ON task_contacts(contact_id);

ALTER TABLE task_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task contacts in their workspace"
  ON task_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_contacts.task_id
      AND tasks.workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert task contacts in their workspace"
  ON task_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_contacts.task_id
      AND tasks.workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete task contacts in their workspace"
  ON task_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_contacts.task_id
      AND tasks.workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Migrate existing task.contact_id relationships to task_contacts junction table
INSERT INTO task_contacts (task_id, contact_id)
SELECT id, contact_id
FROM tasks
WHERE contact_id IS NOT NULL
ON CONFLICT (task_id, contact_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Links System
-- URL bookmark management with tags and project associations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  favicon_url TEXT,
  preview_image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_links (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, link_id)
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links in their workspaces" ON links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = links.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert links in their workspaces" ON links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = links.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update links in their workspaces" ON links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = links.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete links in their workspaces" ON links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = links.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view project_links through workspace" ON project_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project_links through workspace" ON project_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project_links through workspace" ON project_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_links.project_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_links_workspace_id ON links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_tags ON links USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_link_id ON project_links(link_id);

CREATE OR REPLACE FUNCTION update_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER links_updated_at_trigger
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_links_updated_at();

COMMENT ON TABLE links IS 'URL links saved by users with tags and metadata';
COMMENT ON TABLE project_links IS 'Many-to-many relationship between projects and links';
COMMENT ON COLUMN links.tags IS 'Independent tag system for categorizing links (separate from project tags)';
COMMENT ON COLUMN links.favicon_url IS 'URL to the website favicon for display';
COMMENT ON COLUMN links.preview_image_url IS 'URL to a preview/thumbnail image';

-- ----------------------------------------------------------------------------
-- 7. Notification System
-- Tracks notification read status per user and provides badge count functions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own read status" ON notification_read_status;
DROP POLICY IF EXISTS "Users can insert their own read status" ON notification_read_status;
DROP POLICY IF EXISTS "Users can update their own read status" ON notification_read_status;

CREATE POLICY "Users can view their own read status" ON notification_read_status
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read status" ON notification_read_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status" ON notification_read_status
  FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notification_read_status_user_notification 
  ON notification_read_status(user_id, notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification 
  ON notification_read_status(notification_id);

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_workspace_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_user_id UUID := auth.uid();
  unread_count INTEGER := 0;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM notifications n
  WHERE n.workspace_id = p_workspace_id
    AND NOT EXISTS (
      SELECT 1 FROM notification_read_status nrs 
      WHERE nrs.notification_id = n.id 
        AND nrs.user_id = current_user_id
    );
    
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  workspace_uuid UUID;
BEGIN
  SELECT workspace_id INTO workspace_uuid 
  FROM notifications 
  WHERE id = notification_id;
  
  IF workspace_uuid IS NULL THEN
    RAISE EXCEPTION 'Notification not found or access denied';
  END IF;
  
  INSERT INTO notification_read_status (notification_id, user_id, workspace_id)
  VALUES (notification_id, current_user_id, workspace_uuid)
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_workspace_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  notification_record RECORD;
BEGIN
  FOR notification_record IN 
    SELECT id FROM notifications WHERE workspace_id = p_workspace_id
  LOOP
    INSERT INTO notification_read_status (notification_id, user_id, workspace_id)
    VALUES (notification_record.id, current_user_id, p_workspace_id)
    ON CONFLICT (notification_id, user_id) 
    DO UPDATE SET read_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;

COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications for a workspace for the current user';
COMMENT ON FUNCTION mark_notification_read IS 'Mark a specific notification as read by the current user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all notifications in a workspace as read by the current user';
