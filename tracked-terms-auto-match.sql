-- =====================================================
-- AUTO-MATCH NEW ARTICLES TO TRACKED TERMS
-- This will automatically match new RSS articles to tracked terms
-- =====================================================

-- Function to match a new article to all tracked terms
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
  content_lower := LOWER(COALESCE(NEW.content_snippet, ''));

  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    term_lower := LOWER(term_record.term);

    -- Check if the term appears in title or content
    IF title_lower LIKE '%' || term_lower || '%'
       OR content_lower LIKE '%' || term_lower || '%' THEN

      -- Insert match (ignore if already exists)
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
        last_match_at = NOW()
      WHERE id = term_record.id;

    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_match_article_to_tracked_terms ON news_articles;

-- Create trigger to run the function when new articles are inserted
CREATE TRIGGER trigger_match_article_to_tracked_terms
  AFTER INSERT ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION match_article_to_tracked_terms();

-- =====================================================
-- OPTIONAL: Re-match all existing articles to tracked terms
-- Run this once if you want to match existing articles
-- =====================================================

-- Function to manually re-match all articles (can be called as needed)
CREATE OR REPLACE FUNCTION rematch_all_tracked_terms()
RETURNS TABLE (
  term_id UUID,
  term_name TEXT,
  matches_found INTEGER
) AS $$
DECLARE
  term_record RECORD;
  article_record RECORD;
  term_lower TEXT;
  title_lower TEXT;
  content_lower TEXT;
  match_count INTEGER;
BEGIN
  -- Clear all existing matches
  DELETE FROM tracked_term_matches;

  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    term_lower := LOWER(term_record.term);
    match_count := 0;

    -- Loop through recent articles (last 90 days)
    FOR article_record IN
      SELECT id, title, content_snippet
      FROM news_articles
      WHERE published_at >= NOW() - INTERVAL '90 days'
      ORDER BY published_at DESC
    LOOP
      title_lower := LOWER(article_record.title);
      content_lower := LOWER(COALESCE(article_record.content_snippet, ''));

      -- Check if term matches
      IF title_lower LIKE '%' || term_lower || '%'
         OR content_lower LIKE '%' || term_lower || '%' THEN

        INSERT INTO tracked_term_matches (
          tracked_term_id,
          article_id,
          confidence
        )
        VALUES (
          term_record.id,
          article_record.id,
          0.80
        )
        ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

        match_count := match_count + 1;
      END IF;
    END LOOP;

    -- Update the tracked term's match count
    UPDATE tracked_terms
    SET
      match_count = match_count,
      last_match_at = CASE WHEN match_count > 0 THEN NOW() ELSE last_match_at END
    WHERE id = term_record.id;

    -- Return results
    term_id := term_record.id;
    term_name := term_record.term;
    matches_found := match_count;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the trigger is installed
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
