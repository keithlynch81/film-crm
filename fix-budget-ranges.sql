-- Update budget ranges to be medium-specific
-- Run this in your Supabase SQL Editor

-- First, add medium_id column to budget_ranges
ALTER TABLE budget_ranges ADD COLUMN medium_id INTEGER REFERENCES mediums(id);

-- Clear existing budget ranges
DELETE FROM budget_ranges;

-- Get medium IDs
-- Film ID = 1, TV ID = 2 (assuming they were inserted in that order)

-- Insert Film budget ranges
INSERT INTO budget_ranges (label, unit, min_value, max_value, medium_id) VALUES
  ('<$250k', '$', 0, 250000, 1),
  ('$250k-$1m', '$', 250000, 1000000, 1),
  ('$1m-$3m', '$', 1000000, 3000000, 1),
  ('$3m-$10m', '$', 3000000, 10000000, 1),
  ('$10m-$20m', '$', 10000000, 20000000, 1),
  ('$20m-$50m', '$', 20000000, 50000000, 1),
  ('$50m-$100m', '$', 50000000, 100000000, 1),
  ('$100m+', '$', 100000000, NULL, 1);

-- Insert TV budget ranges (per episode)
INSERT INTO budget_ranges (label, unit, min_value, max_value, medium_id) VALUES
  ('<$100k (per ep)', '$', 0, 100000, 2),
  ('$100k-$500k (per ep)', '$', 100000, 500000, 2),
  ('$500k-$1.5m (per ep)', '$', 500000, 1500000, 2),
  ('$1.5m-$3m (per ep)', '$', 1500000, 3000000, 2),
  ('$3m+ (per ep)', '$', 3000000, NULL, 2);