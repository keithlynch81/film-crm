# Apply RSS Tracking Fix - Manual Steps Required

## Problem
The Industry page is not showing recent Netflix mentions because the automatic article matching is failing with this error:
```
column "last_match_date" of relation "tracked_terms" does not exist
```

Articles ARE being saved successfully (44 articles just saved), but they're not being matched to tracked terms like "Netflix".

## Fix Required

You need to manually apply this SQL in the Supabase Dashboard:

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select project: `hqefgtuczwjffuydjwmb`

### Step 2: Open SQL Editor
1. Click "SQL Editor" in the left sidebar
2. Click "New Query"

### Step 3: Paste and Execute This SQL

```sql
-- Add missing column to tracked_terms table
ALTER TABLE tracked_terms
ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tracked_terms_last_match_date
ON tracked_terms(last_match_date);
```

### Step 4: Click "Run"

Wait for the confirmation message that the SQL executed successfully.

## Verify the Fix

After applying the SQL, test the RSS parsing:

### Option 1: Via API (if dev server is running)
```bash
curl -X POST http://localhost:3001/api/market-intelligence/parse-rss
```

### Option 2: Via Production
```bash
curl -X POST https://film-crm.vercel.app/api/market-intelligence/parse-rss
```

## What to Expect After Fix

1. ✅ Articles will be fetched from RSS feeds
2. ✅ Auto-matching will work (no more errors)
3. ✅ Netflix mentions will appear on Industry page
4. ✅ Contact pages will show recent article matches

## Why Manual Application Required

The Supabase CLI and REST API don't support direct DDL (Data Definition Language) execution for security reasons. Schema changes must be applied through:
- Supabase Dashboard SQL Editor (recommended)
- Database migrations via Supabase CLI `db push`
- Direct psql connection (if you have database credentials)

## Files Created
- `/home/keith/fix-rss-last-match-date.sql` - SQL migration file
- `/home/keith/FIX_RSS_TRACKING_ISSUE.md` - Detailed diagnosis
- `/home/keith/APPLY_RSS_FIX.md` - This guide
