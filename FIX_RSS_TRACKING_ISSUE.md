# RSS Tracking Issue - Diagnosis and Fix

## Problem
Industry page only showing 1 Netflix match from 4 days ago, despite multiple recent articles mentioning Netflix.

## Root Cause
RSS feeds are being parsed successfully and articles ARE being saved to the database (44 new articles just added), BUT the automatic matching trigger is failing with this error:

```
column "last_match_date" of relation "tracked_terms" does not exist
```

## What's Happening
1. ✅ RSS Parser is working - just fetched 44 new articles from 11 sources
2. ✅ Articles are being saved to `news_articles` table
3. ❌ Database trigger that auto-matches articles to tracked terms is failing
4. ❌ No new matches are being created (stuck showing old data)

## The Fix

The `tracked_terms` table is missing a column that the matching trigger expects. You need to add the `last_match_date` column to the database.

### SQL to Run in Supabase Dashboard:

```sql
-- Add missing column to tracked_terms table
ALTER TABLE tracked_terms
ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tracked_terms_last_match_date
ON tracked_terms(last_match_date);
```

### How to Apply:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select project: hqefgtuczwjffuydjwmb
3. Click "SQL Editor" in sidebar
4. Paste the SQL above
5. Click "Run"

## Verification

After applying the fix, trigger RSS parsing again to test:

### Option 1: Via Browser (when deployed)
```
POST https://film-crm.vercel.app/api/market-intelligence/parse-rss
```

### Option 2: Via Cron (set up Supabase Edge Function)
Deploy the Edge Function in `/supabase/functions/daily-rss-parser/` and set up a daily cron schedule.

### Option 3: Manual Test (localhost)
```bash
curl -X POST http://localhost:3001/api/market-intelligence/parse-rss
```

## What You Should See After Fix

1. New articles will be fetched from RSS feeds
2. Auto-matching will work (no more `last_match_date` errors)
3. Netflix mentions will appear on Industry page
4. Contacts/companies will show recent matches

## RSS Sources Currently Active
- Variety (variety.com/feed/)
- Deadline (deadline.com/feed/)
- Screen Daily
- Cineuropa
- Film New Europe
- Little White Lies
- Screen Rant
- Collider
- The Hollywood Reporter
- SlashFilm
- FirstShowing

## Long-Term Solution

Set up automated daily RSS parsing:

1. Deploy Supabase Edge Function (`supabase/functions/daily-rss-parser/`)
2. Create cron trigger in Supabase Dashboard
3. Schedule: Run daily at 8:00 AM UTC
4. Edge Function will automatically fetch and match articles

## Recent Test Results (Nov 3, 2025 - 14:09 UTC)
```json
{
  "Variety": { "articlesFound": 10, "saved": 9 },
  "Deadline": { "articlesFound": 12, "saved": 8 },
  "Screen Daily": { "articlesFound": 5, "saved": 4 },
  "Cineuropa": { "articlesFound": 50, "saved": 6 },
  "Screen Rant": { "articlesFound": 10, "saved": 9 },
  "Collider": { "articlesFound": 10, "saved": 1 },
  "The Hollywood Reporter": { "articlesFound": 10, "saved": 3 },
  "Little White Lies": { "articlesFound": 10, "saved": 1 },
  "SlashFilm": { "articlesFound": 20, "saved": 3 }
}
```

**Total: 44 new articles saved** (but matching failed due to missing column)

## Next Steps
1. ✅ Add `last_match_date` column to `tracked_terms` table (SQL above)
2. ✅ Test RSS parsing again
3. ✅ Verify matches appear on Industry page
4. 📅 Set up daily cron job for automated parsing
