# Film CRM

A multi-workspace Film CRM built with Next.js 14 and Supabase.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and add your Supabase credentials
4. Run the Supabase migration in your Supabase project
5. Start the development server: `npm run dev`

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Features

- Multi-workspace support with role-based access
- Project management with submissions tracking
- Contact and company management
- Meeting scheduling
- Team collaboration with email invites
- Row-level security with Supabase

## Database Setup

Run the SQL migration found in `supabase/migration.sql` in your Supabase SQL editor to set up the database schema, RLS policies, and functions.