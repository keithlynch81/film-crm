-- Market Intelligence System
-- News articles from industry publications with contact/company matching

-- News articles table
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('variety', 'deadline', 'screendaily')),
  author TEXT,
  image_url TEXT,
  relevance_score INTEGER DEFAULT 0,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for articles matched to contacts
CREATE TABLE news_contact_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  match_type TEXT CHECK (match_type IN ('name_mention', 'company_mention', 'project_mention')),
  match_confidence FLOAT CHECK (match_confidence >= 0 AND match_confidence <= 1),
  matched_text TEXT, -- The actual text that triggered the match
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_article_id, contact_id)
);

-- Junction table for articles matched to companies
CREATE TABLE news_company_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  match_type TEXT CHECK (match_type IN ('company_mention', 'executive_mention', 'project_mention')),
  match_confidence FLOAT CHECK (match_confidence >= 0 AND match_confidence <= 1),
  matched_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_article_id, company_id)
);

-- Junction table for articles matched to projects
CREATE TABLE news_project_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  match_type TEXT CHECK (match_type IN ('title_mention', 'production_mention', 'development_mention')),
  match_confidence FLOAT CHECK (match_confidence >= 0 AND match_confidence <= 1),
  matched_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_article_id, project_id)
);

-- Indexes for performance
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_source ON news_articles(source);
CREATE INDEX idx_news_articles_processed ON news_articles(is_processed);
CREATE INDEX idx_news_contact_matches_contact_id ON news_contact_matches(contact_id);
CREATE INDEX idx_news_company_matches_company_id ON news_company_matches(company_id);
CREATE INDEX idx_news_project_matches_project_id ON news_project_matches(project_id);

-- Row Level Security
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_company_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_project_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies - News articles are global but matches are workspace-specific
CREATE POLICY "News articles are viewable by authenticated users" ON news_articles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "News contact matches are viewable by workspace members" ON news_contact_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = contact_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "News company matches are viewable by workspace members" ON news_company_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = company_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "News project matches are viewable by workspace members" ON news_project_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_id AND wm.user_id = auth.uid()
    )
  );

-- Function to clean up old articles (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_news_articles()
RETURNS void AS $$
BEGIN
  DELETE FROM news_articles 
  WHERE published_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE news_articles IS 'Industry news articles from RSS feeds';
COMMENT ON TABLE news_contact_matches IS 'Links news articles to contacts based on content matching';
COMMENT ON TABLE news_company_matches IS 'Links news articles to companies based on content matching';
COMMENT ON TABLE news_project_matches IS 'Links news articles to projects based on content matching';