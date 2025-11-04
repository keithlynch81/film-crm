const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function applyMigration() {
  console.log('Applying source constraint fix...\n')

  const sql = fs.readFileSync('fix-news-sources.sql', 'utf8')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Error applying migration:', error)
    // Try direct query approach
    console.log('\nTrying alternative approach...\n')

    // Drop old constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_source_check;'
    })

    if (dropError) {
      console.error('Error dropping constraint:', dropError)
    } else {
      console.log('✓ Dropped old constraint')
    }

    // Add new constraint
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE news_articles ADD CONSTRAINT news_articles_source_check
        CHECK (source IN (
          'variety',
          'deadline',
          'screendaily',
          'cineuropa',
          'filmneweurope',
          'lwlies',
          'screenrant',
          'collider',
          'hollywoodreporter',
          'slashfilm',
          'firstshowing'
        ));`
    })

    if (addError) {
      console.error('Error adding constraint:', addError)
    } else {
      console.log('✓ Added new constraint')
    }
  } else {
    console.log('✓ Migration applied successfully')
  }
}

applyMigration().catch(console.error)
