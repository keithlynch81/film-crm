-- Create talking points table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contact_talking_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contact_id, project_id)
);

-- Add RLS policies
ALTER TABLE contact_talking_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access talking points in their workspace" ON contact_talking_points
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_talking_points_contact_id ON contact_talking_points(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_talking_points_project_id ON contact_talking_points(project_id);
CREATE INDEX IF NOT EXISTS idx_contact_talking_points_workspace_id ON contact_talking_points(workspace_id);