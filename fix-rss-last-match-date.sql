-- Add missing column to tracked_terms table
ALTER TABLE tracked_terms
ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tracked_terms_last_match_date
ON tracked_terms(last_match_date);
