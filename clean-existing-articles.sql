-- Clean HTML entities from existing articles
-- This updates all 201 existing articles to have clean titles and summaries

-- Update titles with HTML entities
UPDATE news_articles
SET title =
  -- Decode numeric entities
  regexp_replace(
    regexp_replace(
      -- Decode hex entities
      regexp_replace(title, '&#x([0-9a-fA-F]+);', '\x' || '\1', 'g'),
      '&#(\d+);',
      '',
      'g'
    ),
    '',
    '',
    'g'
  )
WHERE title ~ '&#';

-- Simpler approach using string replacements
UPDATE news_articles
SET
  title = replace(replace(replace(replace(replace(replace(replace(replace(
    title,
    '&#039;', ''''),
    '&#8216;', '''),
    '&#8217;', '''),
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
  summary = replace(replace(replace(replace(replace(replace(replace(replace(
    summary,
    '&#039;', ''''),
    '&#8216;', '''),
    '&#8217;', '''),
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…')
WHERE title LIKE '%&#%' OR summary LIKE '%&#%';

-- Also handle &amp; entities
UPDATE news_articles
SET
  title = replace(title, '&amp;', '&'),
  summary = replace(summary, '&amp;', '&')
WHERE title LIKE '%&amp;%' OR summary LIKE '%&amp;%';
