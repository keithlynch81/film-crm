const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://hqefgtuczwjffuydjwmb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyFix() {
  console.log('Adding last_match_date column to tracked_terms table...')

  // Add the column
  const { data: addColumnData, error: addColumnError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE tracked_terms ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMPTZ;'
  })

  if (addColumnError) {
    console.error('Error adding column:', addColumnError)
  } else {
    console.log('✅ Column added successfully')
  }

  // Add the index
  const { data: addIndexData, error: addIndexError } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_tracked_terms_last_match_date ON tracked_terms(last_match_date);'
  })

  if (addIndexError) {
    console.error('Error adding index:', addIndexError)
  } else {
    console.log('✅ Index added successfully')
  }

  console.log('\nFix applied! Testing RSS parsing...')
}

applyFix()
