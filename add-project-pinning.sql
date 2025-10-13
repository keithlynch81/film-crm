-- Add pinned column to projects table
-- This allows users to pin projects to the top of their project listings

ALTER TABLE projects
ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance when sorting by pinned status
CREATE INDEX idx_projects_pinned ON projects(workspace_id, pinned DESC, created_at DESC);

-- Add comment to document the column
COMMENT ON COLUMN projects.pinned IS 'Whether this project is pinned to the top of the project list';
