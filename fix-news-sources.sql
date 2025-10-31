-- Fix news_articles source constraint to allow all RSS feed sources
-- Drop the old constraint
ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_source_check;

-- Add new constraint with all RSS feed sources
ALTER TABLE news_articles ADD CONSTRAINT news_articles_source_check
  CHECK (source IN (
    'variety',
    'deadline',
    'screendaily',
    'cineuropa',
    'filmneweurope',
    'lwlies',
    'screenrant',
    'collider',
    'hollywoodreporter',
    'slashfilm',
    'firstshowing'
  ));
