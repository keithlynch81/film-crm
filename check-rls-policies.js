const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkRLS() {
  // Query to get RLS policies
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'news_contact_matches')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('RLS Policies on news_contact_matches:')
    console.log(JSON.stringify(data, null, 2))
  }

  // Also check if RLS is enabled
  const { data: tables, error: tablesError } = await supabase
    .from('pg_tables')
    .select('*')
    .eq('tablename', 'news_contact_matches')
  
  if (tablesError) {
    console.error('Error checking tables:', tablesError)
  } else {
    console.log('\nTable info:')
    console.log(JSON.stringify(tables, null, 2))
  }
}

checkRLS().catch(console.error)
