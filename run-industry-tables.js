const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://zflxnfhqgzmfkpcilzqm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbHhuZmhxZ3ptZmtwY2lsenFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2NzQ5MiwiZXhwIjoyMDQwNDQzNDkyfQ.hVAo8RbYGpkR5Kx9r2FEcPy_ufhyODRKhgGKz0xPHe8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function createTables() {
  console.log('Creating Industry tables...')

  // Read the SQL file
  const sql = fs.readFileSync('/home/keith/create-industry-tables-simple.sql', 'utf8')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ')
    console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}...`)

    try {
      // Execute each statement directly through Supabase
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        console.error(`   ❌ Error:`, error.message || error)
        // Continue anyway, some errors might be expected (like "already exists")
      } else {
        console.log(`   ✅ Success`)
      }
    } catch (err) {
      console.error(`   ❌ Exception:`, err.message || err)
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n✨ Done! Checking if tables were created...')

  // Verify tables exist
  const tables = ['mandates', 'tracked_terms', 'tracked_term_matches']
  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ❌ Table '${tableName}' - Error: ${error.message}`)
      } else {
        console.log(`   ✅ Table '${tableName}' exists (${count || 0} rows)`)
      }
    } catch (err) {
      console.log(`   ❌ Table '${tableName}' - ${err.message}`)
    }
  }
}

createTables().catch(console.error)
