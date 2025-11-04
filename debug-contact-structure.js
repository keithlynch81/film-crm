const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function debugContactStructure() {
  console.log('=== DEBUGGING CONTACT TABLE STRUCTURE ===\n')

  // Get one contact with all fields
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Sample contact fields:')
    console.log(JSON.stringify(data, null, 2))
  }

  // Try to find Ted Sarandos with various field names
  console.log('\n=== SEARCHING FOR SARANDOS ===\n')

  const { data: sarandosResults, error: sarandosError } = await supabase
    .from('contacts')
    .select('*')
    .or('name.ilike.%sarandos%,first_name.ilike.%sarandos%,last_name.ilike.%sarandos%,full_name.ilike.%sarandos%')
    .limit(5)

  console.log('Sarandos search results:', sarandosResults?.length || 0)
  if (sarandosResults && sarandosResults.length > 0) {
    sarandosResults.forEach(c => {
      console.log('\nContact found:')
      console.log(JSON.stringify(c, null, 2))
    })
  }

  // Check news_contact_matches for any matches
  console.log('\n=== CHECKING NEWS_CONTACT_MATCHES ===\n')

  const { data: matches, error: matchError } = await supabase
    .from('news_contact_matches')
    .select('*')
    .limit(5)

  console.log('Total matches:', matches?.length || 0)
  if (matches && matches.length > 0) {
    console.log('\nSample match:')
    console.log(JSON.stringify(matches[0], null, 2))
  }
}

debugContactStructure().catch(console.error)
