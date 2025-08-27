-- Reset articles to unprocessed for testing
-- Run this in Supabase SQL Editor after adding Margot Robbie as a contact

UPDATE news_articles 
SET is_processed = false 
WHERE title ILIKE '%margot robbie%';

-- Also delete any existing matches to start fresh
DELETE FROM news_contact_matches WHERE news_article_id IN (
  SELECT id FROM news_articles WHERE title ILIKE '%margot robbie%'
);

DELETE FROM news_company_matches WHERE news_article_id IN (
  SELECT id FROM news_articles WHERE title ILIKE '%margot robbie%'
);

DELETE FROM news_project_matches WHERE news_article_id IN (
  SELECT id FROM news_articles WHERE title ILIKE '%margot robbie%'
);