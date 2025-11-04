-- Fix tracked term matching and add notification creation
-- Issues fixed:
-- 1. content_snippet → summary
-- 2. Add notification creation for each workspace member
-- 3. Ensure matches appear across all workspaces tracking the same term

-- First, update the trigger function to use 'summary' instead of 'content_snippet'
-- and create notifications for workspace members
CREATE OR REPLACE FUNCTION match_new_article_to_tracked_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  term_record RECORD;
  member_record RECORD;
  match_found BOOLEAN;
  match_id UUID;
BEGIN
  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    match_found := FALSE;

    -- Check if term appears in the new article's title or summary
    IF NEW.title ILIKE '%' || term_record.term || '%' THEN
      match_found := TRUE;
    ELSIF NEW.summary ILIKE '%' || term_record.term || '%' THEN
      match_found := TRUE;
    END IF;

    -- If match found, insert into tracked_term_matches and create notifications
    IF match_found THEN
      -- Insert match (or get existing match ID)
      INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
      VALUES (term_record.id, NEW.id, 0.80)
      ON CONFLICT (tracked_term_id, article_id) DO UPDATE SET matched_at = NOW()
      RETURNING id INTO match_id;

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

      -- Create notifications for all workspace members
      FOR member_record IN
        SELECT user_id
        FROM workspace_members
        WHERE workspace_id = term_record.workspace_id
      LOOP
        INSERT INTO notifications (
          user_id,
          workspace_id,
          notification_type,
          message,
          link,
          is_read
        )
        VALUES (
          member_record.user_id,
          term_record.workspace_id,
          'tracked_term_match',
          'New article matches tracked term "' || term_record.term || '": ' || NEW.title,
          '/industry',
          FALSE
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update the manual match function as well
CREATE OR REPLACE FUNCTION match_tracked_terms_to_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  term_record RECORD;
  article_record RECORD;
  member_record RECORD;
  match_found BOOLEAN;
  match_id UUID;
  matches_created INTEGER := 0;
BEGIN
  -- Loop through all tracked terms
  FOR term_record IN
    SELECT id, term, workspace_id
    FROM tracked_terms
  LOOP
    -- Loop through recent articles (last 30 days)
    FOR article_record IN
      SELECT id, title, summary
      FROM news_articles
      WHERE published_at > NOW() - INTERVAL '30 days'
    LOOP
      -- Check if term appears in title or summary (case-insensitive)
      match_found := FALSE;

      IF article_record.title ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      ELSIF article_record.summary ILIKE '%' || term_record.term || '%' THEN
        match_found := TRUE;
      END IF;

      -- If match found, insert into tracked_term_matches (if not already exists)
      IF match_found THEN
        -- Try to insert, count if new
        INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
        VALUES (term_record.id, article_record.id, 0.80)
        ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

        -- Check if this was a new match
        IF FOUND THEN
          matches_created := matches_created + 1;

          -- Create notifications for all workspace members (for new matches only)
          FOR member_record IN
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = term_record.workspace_id
          LOOP
            INSERT INTO notifications (
              user_id,
              workspace_id,
              notification_type,
              message,
              link,
              is_read
            )
            VALUES (
              member_record.user_id,
              term_record.workspace_id,
              'tracked_term_match',
              'Article matches tracked term "' || term_record.term || '": ' || article_record.title,
              '/industry',
              FALSE
            )
            ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      END IF;
    END LOOP;

    -- Update the tracked term's match count and last match time
    UPDATE tracked_terms
    SET
      match_count = (
        SELECT COUNT(*)
        FROM tracked_term_matches
        WHERE tracked_term_id = term_record.id
      ),
      last_match_at = (
        SELECT MAX(matched_at)
        FROM tracked_term_matches
        WHERE tracked_term_id = term_record.id
      )
    WHERE id = term_record.id;
  END LOOP;

  RAISE NOTICE 'Created % new matches', matches_created;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_match_new_article ON news_articles;

CREATE TRIGGER trigger_match_new_article
  AFTER INSERT ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION match_new_article_to_tracked_terms();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_tracked_terms_to_articles() TO authenticated;
GRANT EXECUTE ON FUNCTION match_new_article_to_tracked_terms() TO authenticated;
