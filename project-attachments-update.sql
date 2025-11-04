-- Update Project Attachments Schema
-- Add role field to cast table and create crew table

-- Add role field to existing project_cast table
ALTER TABLE project_cast ADD COLUMN role TEXT;

-- Create project_crew table for crew members
CREATE TABLE project_crew (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE project_crew ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_crew
CREATE POLICY "Users can view project crew in their workspace" ON project_crew
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project crew in their workspace" ON project_crew
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project crew in their workspace" ON project_crew
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project crew in their workspace" ON project_crew
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_project_crew_project_id ON project_crew(project_id);
CREATE INDEX idx_project_crew_workspace_id ON project_crew(workspace_id);