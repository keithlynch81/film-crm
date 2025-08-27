-- Migration to add roles field to projects table
-- Run this in your Supabase SQL Editor

ALTER TABLE projects ADD COLUMN roles TEXT[];

-- Update TypeScript types by regenerating them after running this migration