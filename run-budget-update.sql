-- Update budget ranges to be medium-specific

-- First, add medium_id column to budget_ranges
ALTER TABLE budget_ranges ADD COLUMN IF NOT EXISTS medium_id INTEGER REFERENCES mediums(id);

-- Clear existing budget ranges
DELETE FROM budget_ranges;

-- Get the medium IDs first
DO $$
DECLARE
    film_id INTEGER;
    tv_id INTEGER;
BEGIN
    -- Get Film and TV IDs
    SELECT id INTO film_id FROM mediums WHERE name = 'Film';
    SELECT id INTO tv_id FROM mediums WHERE name = 'TV';
    
    -- Insert Film budget ranges
    INSERT INTO budget_ranges (label, unit, min_value, max_value, medium_id) VALUES
      ('<$250k', '$', 0, 250000, film_id),
      ('$250k-$1m', '$', 250000, 1000000, film_id),
      ('$1m-$3m', '$', 1000000, 3000000, film_id),
      ('$3m-$10m', '$', 3000000, 10000000, film_id),
      ('$10m-$20m', '$', 10000000, 20000000, film_id),
      ('$20m-$50m', '$', 20000000, 50000000, film_id),
      ('$50m-$100m', '$', 50000000, 100000000, film_id),
      ('$100m+', '$', 100000000, NULL, film_id);

    -- Insert TV budget ranges (per episode)
    INSERT INTO budget_ranges (label, unit, min_value, max_value, medium_id) VALUES
      ('<$100k (per ep)', '$', 0, 100000, tv_id),
      ('$100k-$500k (per ep)', '$', 100000, 500000, tv_id),
      ('$500k-$1.5m (per ep)', '$', 500000, 1500000, tv_id),
      ('$1.5m-$3m (per ep)', '$', 1500000, 3000000, tv_id),
      ('$3m+ (per ep)', '$', 3000000, NULL, tv_id);
END $$;