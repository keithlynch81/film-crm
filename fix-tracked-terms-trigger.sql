-- Fix the tracked terms trigger to use correct column name
-- The trigger was referencing NEW.content_snippet but the column is actually 'summary'

CREATE OR REPLACE FUNCTION match_article_to_tracked_terms()
RETURNS TRIGGER AS $$
DECLARE
  term_record RECORD;
  term_lower TEXT;
  title_lower TEXT;
  content_lower TEXT;
BEGIN
  -- Convert article text to lowercase for case-insensitive matching
  title_lower := LOWER(NEW.title);
  content_lower := LOWER(COALESCE(NEW.summary, '')); -- FIXED: was NEW.content_snippet

  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    term_lower := LOWER(term_record.term);

    -- Check if the term appears in title or content
    IF title_lower LIKE '%' || term_lower || '%'
       OR content_lower LIKE '%' || term_lower || '%' THEN

      -- Insert the match
      INSERT INTO tracked_term_matches (
        tracked_term_id,
        article_id,
        confidence
      )
      VALUES (
        term_record.id,
        NEW.id,
        0.80
      )
      ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

      -- Update the tracked term's match count and last match date
      UPDATE tracked_terms
      SET
        match_count = (
          SELECT COUNT(*)
          FROM tracked_term_matches
          WHERE tracked_term_id = term_record.id
        ),
        last_match_date = NEW.published_at
      WHERE id = term_record.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
