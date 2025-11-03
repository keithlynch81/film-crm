-- Migration: Add many-to-many relationship between tasks and contacts
-- This allows a task to be associated with multiple contacts

-- Create junction table for task-contact relationships
CREATE TABLE IF NOT EXISTS task_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, contact_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_contacts_task_id ON task_contacts(task_id);
CREATE INDEX IF NOT EXISTS idx_task_contacts_contact_id ON task_contacts(contact_id);

-- Enable RLS
ALTER TABLE task_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_contacts
-- Users can view task-contact associations for tasks in their workspace
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

-- Users can insert task-contact associations for tasks in their workspace
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

-- Users can delete task-contact associations for tasks in their workspace
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

-- Migrate existing single contact_id relationships to the junction table
-- This preserves existing task-contact associations
INSERT INTO task_contacts (task_id, contact_id)
SELECT id, contact_id
FROM tasks
WHERE contact_id IS NOT NULL
ON CONFLICT (task_id, contact_id) DO NOTHING;

-- Note: We keep the contact_id column in tasks table for backward compatibility
-- It can be removed in a future migration once all code is updated
-- ALTER TABLE tasks DROP COLUMN contact_id;
