const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://zflxnfhqgzmfkpcilzqm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbHhuZmhxZ3ptZmtwY2lsenFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2NzQ5MiwiZXhwIjoyMDQwNDQzNDkyfQ.hVAo8RbYGpkR5Kx9r2FEcPy_ufhyODRKhgGKz0xPHe8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  const sql = fs.readFileSync('/home/keith/industry-page-migration.sql', 'utf8')

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 100) + '...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Success')
    }
  }

  console.log('Industry page migration complete!')
}

applyMigration().catch(console.error)
