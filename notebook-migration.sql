-- Create notebook table for creative ideas
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[], -- Array of tags like #fight scene, #shootout, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create idea types table (Character, Scene, Action Sequence, Dialogue, Location)
CREATE TABLE IF NOT EXISTS idea_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the standard idea types
INSERT INTO idea_types (name) VALUES 
  ('Character'),
  ('Scene'), 
  ('Action Sequence'),
  ('Dialogue'),
  ('Location')
ON CONFLICT (name) DO NOTHING;

-- Junction table for notebook entries and mediums
CREATE TABLE IF NOT EXISTS notebook_mediums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
  medium_id UUID REFERENCES mediums(id) ON DELETE CASCADE,
  UNIQUE(notebook_entry_id, medium_id)
);

-- Junction table for notebook entries and genres  
CREATE TABLE IF NOT EXISTS notebook_genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE(notebook_entry_id, genre_id)
);

-- Junction table for notebook entries and idea types
CREATE TABLE IF NOT EXISTS notebook_idea_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
  idea_type_id UUID REFERENCES idea_types(id) ON DELETE CASCADE,
  UNIQUE(notebook_entry_id, idea_type_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notebook_entries_workspace_id ON notebook_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_user_id ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_tags ON notebook_entries USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_created_at ON notebook_entries(created_at);

CREATE INDEX IF NOT EXISTS idx_notebook_mediums_entry_id ON notebook_mediums(notebook_entry_id);
CREATE INDEX IF NOT EXISTS idx_notebook_genres_entry_id ON notebook_genres(notebook_entry_id);  
CREATE INDEX IF NOT EXISTS idx_notebook_idea_types_entry_id ON notebook_idea_types(notebook_entry_id);

-- RLS policies
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_idea_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_types ENABLE ROW LEVEL SECURITY;

-- Users can only access notebook entries in their workspaces
CREATE POLICY "Users can view notebook entries in their workspaces" ON notebook_entries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notebook entries in their workspaces" ON notebook_entries
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own notebook entries" ON notebook_entries
  FOR UPDATE USING (
    user_id = auth.uid() AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own notebook entries" ON notebook_entries
  FOR DELETE USING (
    user_id = auth.uid() AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Junction table policies (follow the notebook entry access)
CREATE POLICY "Users can manage mediums for accessible notebook entries" ON notebook_mediums
  FOR ALL USING (
    notebook_entry_id IN (
      SELECT id FROM notebook_entries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage genres for accessible notebook entries" ON notebook_genres
  FOR ALL USING (
    notebook_entry_id IN (
      SELECT id FROM notebook_entries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage idea types for accessible notebook entries" ON notebook_idea_types
  FOR ALL USING (
    notebook_entry_id IN (
      SELECT id FROM notebook_entries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Everyone can read idea types (they're standard reference data)
CREATE POLICY "Anyone can view idea types" ON idea_types
  FOR SELECT TO authenticated USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_notebook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_notebook_updated_at
  BEFORE UPDATE ON notebook_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_updated_at();

-- Comments
COMMENT ON TABLE notebook_entries IS 'Creative ideas and notes not attached to specific projects';
COMMENT ON TABLE idea_types IS 'Types of creative ideas: Character, Scene, Action Sequence, Dialogue, Location';
COMMENT ON TABLE notebook_mediums IS 'Links notebook entries to mediums (Film, TV, etc.)';
COMMENT ON TABLE notebook_genres IS 'Links notebook entries to genres (Drama, Comedy, etc.)';
COMMENT ON TABLE notebook_idea_types IS 'Links notebook entries to idea types (Character, Scene, etc.)';