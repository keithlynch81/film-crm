# Task Email Reminders - Setup Guide

## The Problem
Supabase's pg_cron can't send emails directly. We need an email service.

## The Solution: Resend (Free Tier)
- **Free**: 3,000 emails/month, 100 emails/day
- **Simple**: One API call to send email
- **Reliable**: Built for transactional emails

## Setup Steps

### 1. Create Resend Account (5 minutes)

1. Go to: https://resend.com/signup
2. Sign up with your email
3. Verify your email address
4. Go to API Keys: https://resend.com/api-keys
5. Create a new API key, copy it (starts with `re_`)

### 2. Add Resend API Key to Vercel (2 minutes)

1. Go to: https://vercel.com/keithlynch81/film-crm/settings/environment-variables
2. Add new environment variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_your_api_key_here`
   - **Environment**: All (Production, Preview, Development)
3. Click "Save"
4. Redeploy your app

### 3. Add Resend to .env.local (for local development)

Add this line to your `/home/keith/.env.local` file:
```
RESEND_API_KEY=re_your_api_key_here
```

### 4. Install Resend Package

Run this command:
```bash
cd /home/keith && npm install resend
```

### 5. Create API Route for Sending Emails

I'll create an API route that Supabase can call to send emails.

### 6. Run SQL Migration

Run the SQL file I'll create to set up the database function and cron job.

## How It Works

```
8:00 AM UTC Daily
    ↓
pg_cron triggers function
    ↓
Database queries tasks (overdue, today, this week)
    ↓
Makes HTTP POST to /api/send-task-reminders
    ↓
Next.js API route sends email via Resend
    ↓
User receives email
```

## Email Preview

**Subject:** Task Reminder: 2 overdue, 3 due today

**Body:**
```
Good morning Keith,

Here's your task summary for today (Monday, January 13, 2025):

🔴 OVERDUE TASKS (2):
  • Finish script revisions (Priority 1, Due: Jan 10)
    Project: Her But As A Heist
  • Call producer (Priority 2, Due: Jan 11)
    Contact: John Smith

🟠 DUE TODAY (3):
  • Submit to festival (Priority 1)
    Project: Dental Records Match
  • Review contract (Priority 2)
    Contact: Jane Doe
  • Team meeting (Priority 3)

🟡 DUE THIS WEEK (1):
  • Prepare pitch deck (Priority 1, Due: Jan 15)
    Project: The Company Men

---
View all tasks: https://film-crm-coral.vercel.app/tasks

This is an automated reminder from your Film CRM.
```

## Next Steps

Let me know when you've:
1. Created your Resend account and got the API key
2. Added it to Vercel environment variables
3. Added it to .env.local

Then I'll create the API route and SQL migration files!
