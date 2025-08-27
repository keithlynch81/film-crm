-- Fix critical security issues before deployment

-- 1. Enable RLS on reference tables (they should be read-only for all users)
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_ranges ENABLE ROW LEVEL SECURITY;

-- Add policies for reference tables (everyone can read)
CREATE POLICY "Everyone can read genres" ON genres
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can read mediums" ON mediums
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Everyone can read budget_ranges" ON budget_ranges
    FOR SELECT TO authenticated USING (true);

-- 2. Fix news_articles RLS (already has policies but RLS not enabled)
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- 3. Optional: Fix the security definer view (less critical)
-- This view is used for workspace membership checks
-- The SECURITY DEFINER is actually intentional for this use case
-- We can leave it as-is for now

COMMENT ON TABLE public.genres IS 'Reference data - RLS enabled for security compliance';
COMMENT ON TABLE public.mediums IS 'Reference data - RLS enabled for security compliance';
COMMENT ON TABLE public.budget_ranges IS 'Reference data - RLS enabled for security compliance';
COMMENT ON TABLE public.news_articles IS 'RLS enabled - policies control access';