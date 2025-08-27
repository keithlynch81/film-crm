-- Update seed data to match the reference design
-- Run this in your Supabase SQL Editor

-- Clear existing data
DELETE FROM mediums;
DELETE FROM genres;
DELETE FROM budget_ranges;

-- Insert correct mediums (just Film and TV)
INSERT INTO mediums (name) VALUES
  ('Film'),
  ('TV');

-- Insert all the genres from the reference image
INSERT INTO genres (name) VALUES
  ('Action'),
  ('Adventure'),
  ('Animation'),
  ('Biography'),
  ('Comedy'),
  ('Crime'),
  ('Documentary'),
  ('Drama'),
  ('Family'),
  ('Fantasy'),
  ('Historical'),
  ('Horror'),
  ('Music'),
  ('Musical'),
  ('Mystery'),
  ('Romance'),
  ('Sci-Fi'),
  ('Sport'),
  ('Thriller'),
  ('War'),
  ('Western');

-- Insert budget ranges as shown in the reference
INSERT INTO budget_ranges (label, unit, min_value, max_value) VALUES
  ('<$250k', '$', 0, 250000),
  ('$250k-$1m', '$', 250000, 1000000),
  ('$1m-$3m', '$', 1000000, 3000000),
  ('$3m-$10m', '$', 3000000, 10000000),
  ('$10m-$20m', '$', 10000000, 20000000),
  ('$20m-$50m', '$', 20000000, 50000000),
  ('$50m-$100m', '$', 50000000, 100000000),
  ('$100m+', '$', 100000000, NULL);