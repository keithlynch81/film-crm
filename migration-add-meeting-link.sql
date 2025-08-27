-- Migration to add meeting_link field to meetings table
-- Run this in your Supabase SQL Editor

ALTER TABLE meetings ADD COLUMN meeting_link TEXT;

-- Update TypeScript types by regenerating them after running this migration