-- Create tasks table for task management feature
-- Tasks can optionally be linked to projects and contacts

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

-- Add indexes for better query performance
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_contact ON tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_priority_date ON tasks(workspace_id, priority, target_date);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
-- Users can view tasks in their workspace
CREATE POLICY "Users can view tasks in their workspace" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert tasks in their workspace
CREATE POLICY "Users can insert tasks in their workspace" ON tasks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can update tasks in their workspace
CREATE POLICY "Users can update tasks in their workspace" ON tasks
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can delete tasks in their workspace
CREATE POLICY "Users can delete tasks in their workspace" ON tasks
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Comments for documentation
COMMENT ON TABLE tasks IS 'Task management system for tracking to-do items, optionally linked to projects and contacts';
COMMENT ON COLUMN tasks.heading IS 'Brief task title/heading';
COMMENT ON COLUMN tasks.description IS 'Detailed task information';
COMMENT ON COLUMN tasks.priority IS 'Priority level from 1 (highest) to 5 (lowest)';
COMMENT ON COLUMN tasks.status IS 'Current status: Outstanding, In Process, or Completed';
COMMENT ON COLUMN tasks.target_date IS 'Target completion date for the task';
