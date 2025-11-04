-- Links System Migration
-- Run this in Supabase SQL Editor

-- Create links table
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

-- Create project_links junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS project_links (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, link_id)
);

-- Enable RLS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for links
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

-- RLS Policies for project_links junction table
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

-- Create indexes for performance
CREATE INDEX idx_links_workspace_id ON links(workspace_id);
CREATE INDEX idx_links_created_at ON links(created_at DESC);
CREATE INDEX idx_links_tags ON links USING GIN(tags);
CREATE INDEX idx_project_links_project_id ON project_links(project_id);
CREATE INDEX idx_project_links_link_id ON project_links(link_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER links_updated_at_trigger
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_links_updated_at();

-- Comments
COMMENT ON TABLE links IS 'URL links saved by users with tags and metadata';
COMMENT ON TABLE project_links IS 'Many-to-many relationship between projects and links';
COMMENT ON COLUMN links.tags IS 'Independent tag system for categorizing links (separate from project tags)';
COMMENT ON COLUMN links.favicon_url IS 'URL to the website favicon for display';
COMMENT ON COLUMN links.preview_image_url IS 'URL to a preview/thumbnail image';
