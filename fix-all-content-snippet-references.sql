-- Comprehensive fix for all content_snippet references
-- Change all references from content_snippet to summary

-- Fix 1: match_tracked_terms_to_articles function
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
      SELECT id, title, summary  -- FIXED: was content_snippet
      FROM news_articles
      WHERE published_at > NOW() - INTERVAL '30 days'
    LOOP
      -- Check if term appears in title or content (case-insensitive)
      match_found := FALSE;

      IF article_record.title ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      ELSIF article_record.summary ILIKE '%' || term_record.term || '%' THEN  -- FIXED: was content_snippet
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

-- Fix 2: Trigger function for new articles
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
    ELSIF NEW.summary ILIKE '%' || term_record.term || '%' THEN  -- FIXED: was NEW.content_snippet
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

-- Fix 3: match_article_to_tracked_terms function (if it exists)
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
  content_lower := LOWER(COALESCE(NEW.summary, ''));  -- FIXED: was NEW.content_snippet

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

-- Fix 4: rematch_all_tracked_terms function (if it exists)
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
  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    term_lower := LOWER(term_record.term);
    match_count := 0;

    -- Loop through recent articles (last 90 days)
    FOR article_record IN
      SELECT id, title, summary  -- FIXED: was content_snippet
      FROM news_articles
      WHERE published_at >= NOW() - INTERVAL '90 days'
      ORDER BY published_at DESC
    LOOP
      title_lower := LOWER(article_record.title);
      content_lower := LOWER(COALESCE(article_record.summary, ''));  -- FIXED: was content_snippet

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

    -- Update the tracked term stats
    UPDATE tracked_terms
    SET match_count = match_count
    WHERE id = term_record.id;

    -- Return this term's results
    term_id := term_record.id;
    term_name := term_record.term;
    matches_found := match_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
