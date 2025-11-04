-- =====================================================
-- INDUSTRY PAGE TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create mandates table
CREATE TABLE IF NOT EXISTS mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  company_name TEXT,
  description TEXT NOT NULL,
  budget_min INTEGER,
  budget_max INTEGER,
  genres TEXT[],
  requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create tracked_terms table
CREATE TABLE IF NOT EXISTS tracked_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  term_type TEXT CHECK (term_type IN ('project', 'person', 'company', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_match_at TIMESTAMPTZ,
  match_count INTEGER DEFAULT 0
);

-- 3. Create tracked_term_matches table
CREATE TABLE IF NOT EXISTS tracked_term_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_term_id UUID NOT NULL REFERENCES tracked_terms(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  confidence DECIMAL(3,2) DEFAULT 1.0,
  UNIQUE(tracked_term_id, article_id)
);

-- 4. Enable RLS
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_term_matches ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "workspace_members_mandates" ON mandates;
DROP POLICY IF EXISTS "workspace_members_tracked_terms" ON tracked_terms;
DROP POLICY IF EXISTS "workspace_through_tracked_term" ON tracked_term_matches;

-- 6. Create RLS Policies for mandates
CREATE POLICY "workspace_members_mandates" ON mandates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = mandates.workspace_id
    AND wm.user_id = auth.uid()
  ));

-- 7. Create RLS Policies for tracked_terms
CREATE POLICY "workspace_members_tracked_terms" ON tracked_terms FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = tracked_terms.workspace_id
    AND wm.user_id = auth.uid()
  ));

-- 8. Create RLS Policies for tracked_term_matches
CREATE POLICY "workspace_through_tracked_term" ON tracked_term_matches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tracked_terms tt
    JOIN workspace_members wm ON tt.workspace_id = wm.workspace_id
    WHERE tt.id = tracked_term_matches.tracked_term_id
    AND wm.user_id = auth.uid()
  ));

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mandates_workspace ON mandates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mandates_created_at ON mandates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_terms_workspace ON tracked_terms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tracked_terms_term ON tracked_terms(term);
CREATE INDEX IF NOT EXISTS idx_tracked_term_matches_term ON tracked_term_matches(tracked_term_id);
CREATE INDEX IF NOT EXISTS idx_tracked_term_matches_article ON tracked_term_matches(article_id);
CREATE INDEX IF NOT EXISTS idx_tracked_term_matches_matched_at ON tracked_term_matches(matched_at DESC);

-- 10. Create trigger function for automatic updates
CREATE OR REPLACE FUNCTION update_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger
DROP TRIGGER IF EXISTS trigger_update_mandates_updated_at ON mandates;
CREATE TRIGGER trigger_update_mandates_updated_at
  BEFORE UPDATE ON mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_mandates_updated_at();

-- =====================================================
-- VERIFICATION QUERIES (run these to verify)
-- =====================================================

-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('mandates', 'tracked_terms', 'tracked_term_matches');

-- Check row counts
SELECT 'mandates' as table_name, COUNT(*) as row_count FROM mandates
UNION ALL
SELECT 'tracked_terms', COUNT(*) FROM tracked_terms
UNION ALL
SELECT 'tracked_term_matches', COUNT(*) FROM tracked_term_matches;
