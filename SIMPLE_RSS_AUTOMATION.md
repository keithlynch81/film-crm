# Simple RSS Automation for BOTH Market Intelligence & Tracked Terms

## TL;DR: One Setup for Everything

Currently, RSS parsing is **manual** - you have to visit `/api/market-intelligence/parse-rss` yourself.

This guide sets up **automatic daily parsing** that works for:
- ✅ Market Intelligence (contacts matches)
- ✅ Tracked Terms (project/person/company tracking)

---

## Step 1: Apply Database Trigger (ONE TIME)

This makes new articles automatically match to both contacts AND tracked terms.

### Copy this SQL and run in Supabase SQL Editor:

```sql
-- Auto-match new articles to tracked terms
CREATE OR REPLACE FUNCTION match_article_to_tracked_terms()
RETURNS TRIGGER AS $$
DECLARE
  term_record RECORD;
  term_lower TEXT;
  title_lower TEXT;
  content_lower TEXT;
BEGIN
  title_lower := LOWER(NEW.title);
  content_lower := LOWER(COALESCE(NEW.content_snippet, ''));

  FOR term_record IN
    SELECT id, term FROM tracked_terms
  LOOP
    term_lower := LOWER(term_record.term);

    IF title_lower LIKE '%' || term_lower || '%'
       OR content_lower LIKE '%' || term_lower || '%' THEN

      INSERT INTO tracked_term_matches (tracked_term_id, article_id, confidence)
      VALUES (term_record.id, NEW.id, 0.80)
      ON CONFLICT (tracked_term_id, article_id) DO NOTHING;

      UPDATE tracked_terms
      SET match_count = (SELECT COUNT(*) FROM tracked_term_matches WHERE tracked_term_id = term_record.id),
          last_match_at = NOW()
      WHERE id = term_record.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_match_article_to_tracked_terms ON news_articles;

CREATE TRIGGER trigger_match_article_to_tracked_terms
  AFTER INSERT ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION match_article_to_tracked_terms();
```

**That's it for Step 1!** New articles will now auto-match to tracked terms.

---

## Step 2: Schedule Daily RSS Parsing (CHOOSE ONE)

### Option A: EasyCron (Free & Simple - RECOMMENDED)

1. Sign up: https://www.easycron.com/user/register
2. Create New Cron Job:
   - **Cron Expression**: `0 6 * * *` (6 AM daily)
   - **URL**: `https://YOUR-APP.vercel.app/api/market-intelligence/parse-rss`
   - **Request Method**: POST
   - **Timezone**: Your timezone
3. Save

Done! EasyCron will call your endpoint daily.

### Option B: Cron-job.org (Free Alternative)

1. Sign up: https://cron-job.org/en/signup/
2. Create Cronjob:
   - **Title**: Daily RSS Parser
   - **Address**: `https://YOUR-APP.vercel.app/api/market-intelligence/parse-rss`
   - **Schedule**: Daily at 06:00
   - **Request method**: POST
3. Save

### Option C: Vercel Cron (If you have Vercel Pro)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/market-intelligence/parse-rss",
    "schedule": "0 6 * * *"
  }]
}
```

Deploy and it's automatic.

---

## How It Works

```
Every Day at 6 AM:
  ↓
EasyCron/Cron-job.org calls your API
  ↓
/api/market-intelligence/parse-rss runs
  ↓
Fetches RSS feeds from:
  - Variety
  - Deadline
  - Screen Daily
  - The Hollywood Reporter
  - And 7 more sources
  ↓
Saves new articles to news_articles table
  ↓
Database trigger fires automatically
  ↓
BOTH systems update:
  ✅ Contact matches (Market Intelligence)
  ✅ Tracked term matches (Track section)
  ↓
Done! Users see updates automatically
```

---

## Test It Now

1. **Verify trigger installed:**
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
```

2. **Manually trigger RSS parse** (to test before waiting 24 hours):
```bash
curl -X POST https://YOUR-APP.vercel.app/api/market-intelligence/parse-rss
```

3. **Check if it worked:**
   - Go to Industry page → Track tab
   - Your tracked terms should show updated match counts
   - Go to Contacts → Click a contact
   - Market Intelligence section should show articles

---

## That's It!

Once Step 1 & 2 are complete:
- ✅ RSS feeds parse automatically every day
- ✅ New articles match to contacts (Market Intelligence)
- ✅ New articles match to tracked terms (Track section)
- ✅ Everything updates without manual work

**No complex setup. No Edge Functions. Just works.**
