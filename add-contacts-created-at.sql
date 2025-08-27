-- Add missing created_at field to contacts table
-- This field was included in projects but missing from contacts

ALTER TABLE contacts 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing contacts to have a created_at timestamp
-- Set to current time for existing records since we don't have historical data
UPDATE contacts 
SET created_at = NOW() 
WHERE created_at IS NULL;