-- Add project linking to notebook entries
ALTER TABLE notebook_entries 
ADD COLUMN linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notebook_entries_linked_project_id ON notebook_entries(linked_project_id);

-- Comment
COMMENT ON COLUMN notebook_entries.linked_project_id IS 'Optional link to project when idea is used in a project';