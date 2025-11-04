# Quick Setup: Automated Tracked Terms Matching

## ✅ What You Have Now

- Track section working - terms appear immediately when added
- Manual matching searches last 90 days of existing articles

## 🎯 What You Need: Daily Automation

To make tracked terms update automatically with new articles **every day**, follow these 2 steps:

---

## Step 1: Apply Database Trigger (5 minutes)

This makes new articles automatically match to tracked terms.

### Go to Supabase Dashboard:
1. Open https://supabase.com/dashboard/project/zflxnfhqgzmfkpcilzqm
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `tracked-terms-auto-match.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

### You should see:
```
Success. No rows returned
```

**That's it!** New articles will now automatically match to tracked terms.

---

## Step 2: Schedule Daily RSS Parsing (Choose ONE option)

### Option A: Use EasyCron (Simplest - 2 minutes)

1. Go to https://www.easycron.com/user/register (free account)
2. After login, click **Create Cron Job**
3. Fill in:
   - **Cron Expression**: `0 6 * * *` (daily at 6 AM)
   - **URL**: `https://YOUR-VERCEL-APP.vercel.app/api/market-intelligence/parse-rss`
   - **Method**: POST
   - **Name**: Daily RSS Parser
4. Click **Create**

### Option B: Use Vercel Cron (If you're on Vercel Pro)

1. Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/market-intelligence/parse-rss",
      "schedule": "0 6 * * *"
    }
  ]
}
```

2. Deploy to Vercel
3. Done! Vercel will automatically call your endpoint daily

### Option C: Manual (Test it first)

You can manually trigger RSS parsing anytime by visiting:
```
https://YOUR-APP/api/market-intelligence/parse-rss
```

Or using curl:
```bash
curl -X POST https://YOUR-APP/api/market-intelligence/parse-rss
```

---

## 🧪 Test It Works

### Test 1: Verify the trigger

Run this in Supabase SQL Editor:

```sql
-- Check trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
```

You should see 1 row.

### Test 2: Add a tracked term

1. Go to Industry page → Track tab
2. Add "Christopher Nolan" as a Person
3. It should appear immediately in the list
4. If there are articles mentioning him in the last 90 days, match count will update within a few seconds

### Test 3: Test RSS parsing

Visit or curl your parse-rss endpoint. Check the response - it should show articles found and saved.

---

## 📊 How It Works

```
Every Day at 6 AM:
  ↓
RSS Parser runs → Fetches new articles from:
  - Variety
  - Deadline
  - Screen Daily
  - The Hollywood Reporter
  ↓
New articles saved to database
  ↓
Trigger automatically runs → Matches articles to ALL tracked terms
  ↓
Match counts update
  ↓
Users see new matches in Industry page
```

---

## 🎉 You're Done!

Once both steps are complete:

✅ Add any term you want to track
✅ New industry news will automatically be matched daily
✅ Match counts and articles appear automatically
✅ No manual work needed

---

## Need Help?

If something doesn't work:

1. **Trigger not working?**
   - Check it exists: Run the verification query above
   - Re-run the SQL from Step 1

2. **RSS not parsing?**
   - Test manually first: Visit /api/market-intelligence/parse-rss
   - Check your cron service is active
   - Verify the URL is correct

3. **No matches appearing?**
   - Wait 24 hours for first automated run
   - Or manually trigger RSS parsing to test immediately
   - Check your tracked terms are spelled correctly
