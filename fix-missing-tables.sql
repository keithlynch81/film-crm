-- Fix missing junction tables for projects
-- This SQL adds the missing project_mediums and project_budget_ranges tables

-- Create project_mediums table
CREATE TABLE IF NOT EXISTS project_mediums (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  medium_id INTEGER REFERENCES mediums(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, medium_id)
);

-- Create project_budget_ranges table
CREATE TABLE IF NOT EXISTS project_budget_ranges (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  budget_range_id INTEGER REFERENCES budget_ranges(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, budget_range_id)
);

-- Enable RLS on new tables
ALTER TABLE project_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_ranges ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_mediums' AND policyname = 'workspace_through_project_mediums') THEN
    CREATE POLICY "workspace_through_project_mediums" ON project_mediums FOR ALL
      USING (EXISTS (SELECT 1 FROM projects p JOIN workspace_members wm ON p.workspace_id = wm.workspace_id WHERE p.id = project_mediums.project_id AND wm.user_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_budget_ranges' AND policyname = 'workspace_through_project_budget_ranges') THEN
    CREATE POLICY "workspace_through_project_budget_ranges" ON project_budget_ranges FOR ALL
      USING (EXISTS (SELECT 1 FROM projects p JOIN workspace_members wm ON p.workspace_id = wm.workspace_id WHERE p.id = project_budget_ranges.project_id AND wm.user_id = auth.uid()));
  END IF;
END $$;