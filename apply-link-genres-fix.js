const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://zflxnfhqgzmfkpcilzqm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbHhuZmhxZ3ptZmtwY2lsenFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2NzQ5MiwiZXhwIjoyMDQwNDQzNDkyfQ.hVAo8RbYGpkR5Kx9r2FEcPy_ufhyODRKhgGKz0xPHe8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyFix() {
  console.log('Applying link_genres RLS policy fix...')

  const sql = fs.readFileSync('fix-link-genres-rls.sql', 'utf8')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Error applying fix:', error)

    // If exec_sql doesn't exist, try executing statements separately
    console.log('Trying to execute statements separately...')

    // Drop old policy
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: 'DROP POLICY IF EXISTS "workspace_through_link" ON link_genres;'
    })

    if (dropError) {
      console.error('Drop policy error:', dropError)
      console.log('Attempting direct query...')

      // Try using PostgreSQL directly via query
      const { error: directError } = await supabase
        .from('_realtime')
        .select('*')
        .limit(0)

      console.log('Cannot execute DDL via Supabase JS client.')
      console.log('\nPlease run this SQL in the Supabase SQL Editor:')
      console.log('--------------------------------------------------')
      console.log(sql)
      console.log('--------------------------------------------------')
      return
    }

    // Create new policy
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: `CREATE POLICY "workspace_through_link" ON link_genres FOR ALL
        USING (EXISTS (
          SELECT 1 FROM links l
          JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
          WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM links l
          JOIN workspace_members wm ON l.workspace_id = wm.workspace_id
          WHERE l.id = link_genres.link_id AND wm.user_id = auth.uid()
        ));`
    })

    if (createError) {
      console.error('Create policy error:', createError)
    } else {
      console.log('✓ RLS policy fixed successfully!')
    }
  } else {
    console.log('✓ RLS policy fixed successfully!')
    console.log('Data:', data)
  }
}

applyFix()
