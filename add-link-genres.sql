-- Add genre association for links
CREATE TABLE IF NOT EXISTS link_genres (
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, genre_id)
);

-- Enable RLS
ALTER TABLE link_genres ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access through workspace membership via links table
-- IMPORTANT: FOR ALL requires both USING and WITH CHECK clauses
DROP POLICY IF EXISTS "workspace_through_link" ON link_genres;

CREATE POLICY "workspace_through_link" ON link_genres FOR ALL
  USING (EXISTS (
    SELECT 1 FROM links l
    JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
    WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM links l
    JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
    WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_link_genres_link_id ON link_genres(link_id);
CREATE INDEX IF NOT EXISTS idx_link_genres_genre_id ON link_genres(genre_id);
