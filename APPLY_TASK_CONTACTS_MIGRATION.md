# How to Apply the Task Contacts Migration

## Quick Steps

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `hqefgtuczwjffuydjwmb`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open the file: `task-contacts-migration.sql`
   - Copy all the SQL content

4. **Execute Migration**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for confirmation message

5. **Verify**
   - Check that the migration succeeded
   - Look for "Success" message
   - The `task_contacts` table should now exist

## What the Migration Does

✅ Creates `task_contacts` junction table
✅ Adds RLS policies for workspace isolation
✅ Creates indexes for performance
✅ Migrates existing contact relationships
✅ Maintains backward compatibility

## After Migration

The changes will take effect immediately on Vercel (already deployed).

Test by:
1. Going to /tasks/new
2. Selecting multiple contacts
3. Creating a task
4. Verifying contacts appear correctly on /tasks page

## Troubleshooting

If migration fails:
- Check that you're connected to the correct project
- Ensure you have admin permissions
- Look at error message for specific issues
- The migration is idempotent (safe to run multiple times)

## Migration SQL Location
File: `/home/keith/task-contacts-migration.sql`
