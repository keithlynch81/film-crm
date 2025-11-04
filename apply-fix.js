const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function applySQLFile(filepath) {
  console.log(`=== APPLYING ${filepath} ===\n`)

  const sql = fs.readFileSync(filepath, 'utf8')

  // Split by semicolons (simple approach)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let success = 0
  let failed = 0

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: statement + ';' })

      if (error) {
        console.error('Error executing statement:', error.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
        failed++
      } else {
        success++
      }
    } catch (err) {
      console.error('Exception:', err.message)
      failed++
    }
  }

  console.log(`\n✅ Applied SQL: ${success} statements succeeded, ${failed} failed\n`)
}

applySQLFile('fix-tracked-term-notifications.sql').catch(console.error)
