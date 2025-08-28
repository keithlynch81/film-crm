
# Filmmakers CRM MVP

Single user MVP built with Next.js 14 and Supabase.

## Setup

1. Create a new Supabase project. Get your Project URL and anon key.
2. In the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/policies.sql`.
3. In Authentication settings, enable Email OTP or Email plus Password.
4. Copy `.env.local.example` to `.env.local` and fill in values.
5. `npm install`, then `npm run dev`.

## Notes

- All user scoped tables enforce RLS with `user_id = auth.uid()`.
- Lookup tables are readable to any signed in user.
- Budgets are stored in USD cents.
- Call the RPC `match_contacts_for_project(project_id)` to get ranked contacts.
- The app now **auto-creates** your `public.users` profile row after you sign in; no SQL trigger needed.
