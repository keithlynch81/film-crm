-- Fix budget ranges with proper medium IDs

-- First, let's see what mediums exist
SELECT * FROM mediums;

-- Add medium_id column if it doesn't exist
ALTER TABLE budget_ranges ADD COLUMN IF NOT EXISTS medium_id INTEGER REFERENCES mediums(id);

-- Clear existing budget ranges
DELETE FROM budget_ranges;

-- Insert mediums if they don't exist
INSERT INTO mediums (name) VALUES ('Film') ON CONFLICT (name) DO NOTHING;
INSERT INTO mediums (name) VALUES ('TV') ON CONFLICT (name) DO NOTHING;

-- Now insert budget ranges using a safer approach
DO $$
DECLARE
    film_id INTEGER;
    tv_id INTEGER;
BEGIN
    -- Get or create Film medium
    SELECT id INTO film_id FROM mediums WHERE name = 'Film';
    IF film_id IS NULL THEN
        INSERT INTO mediums (name) VALUES ('Film') RETURNING id INTO film_id;
    END IF;
    
    -- Get or create TV medium
    SELECT id INTO tv_id FROM mediums WHERE name = 'TV';
    IF tv_id IS NULL THEN
        INSERT INTO mediums (name) VALUES ('TV') RETURNING id INTO tv_id;
    END IF;
    
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
      
    RAISE NOTICE 'Successfully created budget ranges for Film ID: % and TV ID: %', film_id, tv_id;
END $$;

-- Verify the results
SELECT br.*, m.name as medium_name 
FROM budget_ranges br 
JOIN mediums m ON br.medium_id = m.id 
ORDER BY m.name, br.min_value;