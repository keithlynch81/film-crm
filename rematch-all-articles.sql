-- Manually run the matching function on all existing articles
-- This will create matches for articles that were inserted before the trigger was fixed

DO $$
DECLARE
  article_record RECORD;
  term_record RECORD;
  match_found BOOLEAN;
  articles_processed INTEGER := 0;
  matches_created INTEGER := 0;
BEGIN
  -- Loop through all articles
  FOR article_record IN
    SELECT id, title, summary
    FROM news_articles
    ORDER BY created_at DESC
  LOOP
    articles_processed := articles_processed + 1;

    -- Loop through all tracked terms
    FOR term_record IN
      SELECT id, term
      FROM tracked_terms
    LOOP
      match_found := FALSE;

      -- Check if term appears in the article's title or summary
      IF article_record.title ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      ELSIF article_record.summary ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      END IF;

      -- If match found, insert into tracked_term_matches
      IF match_found THEN
        INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
        VALUES (term_record.id, article_record.id, 0.80)
        ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

        matches_created := matches_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Update all tracked term match counts
  UPDATE tracked_terms t
  SET match_count = (
    SELECT COUNT(*)
    FROM tracked_term_matches
    WHERE tracked_term_id = t.id
  );

  RAISE NOTICE 'Processed % articles and created % matches', articles_processed, matches_created;
END $$;
