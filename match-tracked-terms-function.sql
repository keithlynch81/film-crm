-- Function to match tracked terms against news articles
-- This should be called periodically (e.g., when new articles are added)

CREATE OR REPLACE FUNCTION match_tracked_terms_to_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  term_record RECORD;
  article_record RECORD;
  match_found BOOLEAN;
BEGIN
  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    -- Loop through recent articles (last 30 days)
    FOR article_record IN
      SELECT id, title, content_snippet
      FROM news_articles
      WHERE published_at > NOW() - INTERVAL '30 days'
    LOOP
      -- Check if term appears in title or content (case-insensitive)
      match_found := FALSE;

      IF article_record.title ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      ELSIF article_record.content_snippet ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      END IF;

      -- If match found, insert into tracked_term_matches (if not already exists)
      IF match_found THEN
        INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
        VALUES (term_record.id, article_record.id, 0.80)
        ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

        -- Update the tracked term's match count and last match time
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
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_tracked_terms_to_articles() TO authenticated;

-- Trigger function to match new articles against tracked terms
CREATE OR REPLACE FUNCTION match_new_article_to_tracked_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  term_record RECORD;
  match_found BOOLEAN;
BEGIN
  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    match_found := FALSE;

    -- Check if term appears in the new article's title or content
    IF NEW.title ILIKE '%' || term_record.term || '%' THEN
      match_found := TRUE;
    ELSIF NEW.content_snippet ILIKE '%' || term_record.term || '%' THEN
      match_found := TRUE;
    END IF;

    -- If match found, insert into tracked_term_matches
    IF match_found THEN
      INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
      VALUES (term_record.id, NEW.id, 0.80)
      ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

      -- Update the tracked term's match count and last match time
      UPDATE tracked_terms
      SET
        match_count = match_count + 1,
        last_match_at = NOW()
      WHERE id = term_record.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on news_articles table
DROP TRIGGER IF EXISTS trigger_match_new_article ON news_articles;

CREATE TRIGGER trigger_match_new_article
  AFTER INSERT ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION match_new_article_to_tracked_terms();
