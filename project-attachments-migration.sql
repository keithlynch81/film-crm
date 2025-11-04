-- Project Attachments Migration
-- Adds attachments functionality to projects with multiple producers and cast members

-- Create project_attachments table for single-value fields
CREATE TABLE project_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  production_company_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  sales_agent TEXT,
  financier TEXT,
  distributor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_producers table for multiple producers
CREATE TABLE project_producers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_cast table for multiple cast members
CREATE TABLE project_cast (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cast ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_attachments
CREATE POLICY "Users can view project attachments in their workspace" ON project_attachments
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project attachments in their workspace" ON project_attachments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project attachments in their workspace" ON project_attachments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project attachments in their workspace" ON project_attachments
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for project_producers
CREATE POLICY "Users can view project producers in their workspace" ON project_producers
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project producers in their workspace" ON project_producers
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project producers in their workspace" ON project_producers
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for project_cast
CREATE POLICY "Users can view project cast in their workspace" ON project_cast
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project cast in their workspace" ON project_cast
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project cast in their workspace" ON project_cast
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project cast in their workspace" ON project_cast
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX idx_project_attachments_workspace_id ON project_attachments(workspace_id);
CREATE INDEX idx_project_producers_project_id ON project_producers(project_id);
CREATE INDEX idx_project_producers_workspace_id ON project_producers(workspace_id);
CREATE INDEX idx_project_cast_project_id ON project_cast(project_id);
CREATE INDEX idx_project_cast_workspace_id ON project_cast(workspace_id);