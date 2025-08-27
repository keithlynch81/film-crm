-- Fix Market Intelligence RLS issue after enabling RLS on news_articles

-- The news_articles table should be accessible to all authenticated users
-- since it contains public industry news, not workspace-specific data
CREATE POLICY "Authenticated users can read news articles" ON news_articles
    FOR SELECT TO authenticated USING (true);

-- Service role needs full access for RSS parsing and article management
CREATE POLICY "Service role can manage news articles" ON news_articles
    FOR ALL TO service_role USING (true);

-- Allow anonymous access for service role operations (RSS parsing)
CREATE POLICY "Anonymous can read news articles" ON news_articles
    FOR SELECT TO anon USING (true);

-- Test the fix by checking if we can query news articles
-- This should return articles if the RLS policies are working
-- SELECT COUNT(*) FROM news_articles;