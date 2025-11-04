# Daily RSS Parsing & Tracked Terms Auto-Matching Setup

This guide sets up automated daily RSS parsing with automatic matching to tracked terms.

## Overview

When complete, your system will:
- ✅ Parse RSS feeds from 4 major industry publications **daily**
- ✅ Automatically match new articles to all tracked terms
- ✅ Update match counts and notifications in real-time
- ✅ Clean up old articles automatically

---

## Step 1: Apply Database Trigger (REQUIRED)

This trigger automatically matches new articles to tracked terms as they're inserted.

### Run this SQL in Supabase SQL Editor:

```sql
-- Copy and paste the contents of tracked-terms-auto-match.sql
```

Or run directly:
```bash
psql "postgresql://postgres.zflxnfhqgzmfkpcilzqm:KeithBurgundy1!@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f tracked-terms-auto-match.sql
```

### Verify it worked:
```sql
-- Check trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
```

You should see 1 row returned.

---

## Step 2: Deploy Supabase Edge Function (RECOMMENDED)

### Option A: Deploy via Supabase CLI

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Login to Supabase**:
```bash
supabase login
```

3. **Link your project**:
```bash
supabase link --project-ref zflxnfhqgzmfkpcilzqm
```

4. **Deploy the Edge Function**:
```bash
supabase functions deploy daily-rss-parser
```

5. **Set up the cron schedule** in Supabase Dashboard:
   - Go to: Database → Extensions → Enable `pg_cron`
   - Go to: SQL Editor
   - Run this SQL:

```sql
-- Schedule the function to run daily at 6 AM UTC
SELECT cron.schedule(
  'daily-rss-parse',
  '0 6 * * *', -- Every day at 6 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://zflxnfhqgzmfkpcilzqm.supabase.co/functions/v1/daily-rss-parser',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);
```

6. **Verify cron job**:
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-rss-parse';
```

---

### Option B: Use External Cron Service (ALTERNATIVE)

If you prefer not to use Supabase Edge Functions, you can use an external service to call your existing API endpoint.

1. **Use cron-job.org** (free):
   - Go to: https://cron-job.org
   - Create account
   - Create new cron job:
     - URL: `https://your-vercel-app.vercel.app/api/market-intelligence/parse-rss`
     - Schedule: Daily at 6 AM
     - Method: POST

2. **Or use EasyCron** (free tier available):
   - Go to: https://www.easycron.com
   - Similar setup as above

---

## Step 3: Test the System

### Test the trigger manually:

```sql
-- Insert a test article mentioning a tracked term
-- Replace 'YOUR_TRACKED_TERM' with an actual term you're tracking

INSERT INTO news_articles (
  title,
  url,
  source,
  published_at,
  content_snippet
) VALUES (
  'Breaking: YOUR_TRACKED_TERM announces new project',
  'https://example.com/test-' || gen_random_uuid(),
  'test',
  NOW(),
  'This is a test article mentioning YOUR_TRACKED_TERM in the content.'
);

-- Check if match was created automatically
SELECT
  tt.term,
  tt.match_count,
  COUNT(ttm.id) as actual_matches
FROM tracked_terms tt
LEFT JOIN tracked_term_matches ttm ON tt.id = ttm.tracked_term_id
GROUP BY tt.id, tt.term, tt.match_count;
```

### Test RSS parsing manually:

**If using Edge Function:**
```bash
curl -X POST \
  https://zflxnfhqgzmfkpcilzqm.supabase.co/functions/v1/daily-rss-parser \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

**If using Next.js API:**
```bash
curl -X POST https://your-app.vercel.app/api/market-intelligence/parse-rss
```

---

## Step 4: Monitor the System

### Check recent matches:
```sql
SELECT
  tt.term,
  tt.match_count,
  tt.last_match_at,
  COUNT(ttm.id) as matches_last_7_days
FROM tracked_terms tt
LEFT JOIN tracked_term_matches ttm ON tt.id = ttm.tracked_term_id
LEFT JOIN news_articles na ON ttm.article_id = na.id
WHERE na.published_at >= NOW() - INTERVAL '7 days'
GROUP BY tt.id, tt.term, tt.match_count, tt.last_match_at
ORDER BY tt.last_match_at DESC NULLS LAST;
```

### Check cron job execution (if using pg_cron):
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-rss-parse')
ORDER BY start_time DESC
LIMIT 10;
```

### View recent articles:
```sql
SELECT
  title,
  source,
  published_at,
  (SELECT COUNT(*) FROM tracked_term_matches WHERE article_id = news_articles.id) as matches
FROM news_articles
WHERE published_at >= NOW() - INTERVAL '24 hours'
ORDER BY published_at DESC;
```

---

## Optional: Re-match ALL Existing Articles

If you want to match all existing articles (last 90 days) to your tracked terms:

```sql
-- This may take a few seconds depending on article count
SELECT * FROM rematch_all_tracked_terms();
```

This will show you how many matches were found for each term.

---

## Troubleshooting

### Articles not matching to tracked terms?

1. **Check trigger exists**:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
```

2. **Check for errors in logs**:
```sql
-- In Supabase Dashboard → Logs → Database
```

3. **Manually run the matching function**:
```sql
SELECT * FROM rematch_all_tracked_terms();
```

### RSS parsing not running?

1. **Check cron job status**:
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-rss-parse';
```

2. **Check cron job logs**:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-rss-parse')
ORDER BY start_time DESC;
```

3. **Test manually** using the curl commands above

### Performance issues?

If you have many tracked terms (100+) and articles, consider:
- Adding an index: `CREATE INDEX idx_news_articles_title_content ON news_articles USING gin(to_tsvector('english', title || ' ' || content_snippet));`
- Limiting the trigger to only check recent articles
- Running full re-matches less frequently

---

## Current Configuration

**RSS Feeds Monitored:**
- Variety
- Deadline
- Screen Daily
- The Hollywood Reporter

**Matching Algorithm:**
- Case-insensitive substring matching
- Searches both title and content
- Confidence score: 0.80

**Schedule:**
- Daily at 6:00 AM UTC (adjust in cron schedule as needed)

**Article Retention:**
- Articles older than 90 days are used for matching but may be archived

---

## Next Steps

Once setup is complete:

1. ✅ Add your first tracked term in the Industry page → Track tab
2. ✅ Wait 24 hours for first automated run (or test manually)
3. ✅ Check the Track section to see new matches appear
4. ✅ Matches will appear automatically - no manual action needed!

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Test components individually (trigger, parsing, matching)
4. Verify environment variables are set correctly
