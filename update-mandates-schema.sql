-- Update mandates table with new field names and admin-only access

-- First, let's rename/restructure the columns to match your requirements
ALTER TABLE mandates
  RENAME COLUMN buyer_name TO buyer;

ALTER TABLE mandates
  RENAME COLUMN description TO sum_up;

ALTER TABLE mandates
  RENAME COLUMN company_name TO overall_tone;

-- Add new fields
ALTER TABLE mandates
  ADD COLUMN IF NOT EXISTS key_traits TEXT;

ALTER TABLE mandates
  RENAME COLUMN requirements TO in_short;

-- Remove budget fields (no longer needed based on your requirements)
ALTER TABLE mandates
  DROP COLUMN IF EXISTS budget_min;

ALTER TABLE mandates
  DROP COLUMN IF EXISTS budget_max;

-- The genres column already exists and is perfect for your needs!

-- Update RLS policy to restrict to keith@arecibomedia.com only
DROP POLICY IF EXISTS "workspace_members_mandates" ON mandates;

CREATE POLICY "admin_only_mandates" ON mandates FOR ALL
  USING (
    auth.email() = 'keith@arecibomedia.com'
  );

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mandates'
ORDER BY ordinal_position;
