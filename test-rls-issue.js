const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testRLSIssue() {
  const extraWorkspaceId = 'decd6e7a-0ee1-4317-9192-be367c199055'

  console.log('=== TESTING EXTRA WORKSPACE MARKET INTELLIGENCE ===\n')

  // Step 1: Get contacts
  console.log('Step 1: Getting contacts in Extra Workspace...')
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('workspace_id', extraWorkspaceId)

  console.log(`  Result: ${contacts?.length || 0} contacts`)
  if (contactError) console.error('  Error:', contactError)

  if (contacts && contacts.length > 0) {
    console.log('  Sample contacts:')
    contacts.slice(0, 5).forEach(c => {
      console.log(`    - ${c.first_name} ${c.last_name} (${c.id.substring(0, 8)}...)`)
    })
  }

  const contactIds = contacts?.map(c => c.id) || []

  if (contactIds.length === 0) {
    console.log('\n❌ No contacts found in Extra Workspace!')
    return
  }

  // Step 2: Direct query to news_contact_matches
  console.log(`\nStep 2: Querying news_contact_matches for ${contactIds.length} contacts...`)

  const { data: rawMatches, error: rawError } = await supabase
    .from('news_contact_matches')
    .select('*')
    .in('contact_id', contactIds)

  console.log(`  Raw matches: ${rawMatches?.length || 0}`)
  if (rawError) console.error('  Error:', rawError)
  if (rawMatches && rawMatches.length > 0) {
    console.log('  Sample raw match:')
    console.log('   ', JSON.stringify(rawMatches[0], null, 2))
  }

  // Step 3: Try the JOIN query
  console.log('\nStep 3: Trying JOIN query with news_articles...')

  const { data: joinMatches, error: joinError } = await supabase
    .from('news_contact_matches')
    .select(`
      news_article_id,
      news_articles (
        id,
        title,
        url,
        source,
        published_at,
        summary
      )
    `)
    .in('contact_id', contactIds)

  console.log(`  Join matches: ${joinMatches?.length || 0}`)
  if (joinError) {
    console.error('  Error:', joinError)
  } else if (joinMatches && joinMatches.length > 0) {
    console.log('\n✅ Articles found:')
    joinMatches.forEach(m => {
      console.log(`  - [${m.news_articles?.source}] ${m.news_articles?.title}`)
    })
  }

  // Step 4: Try with explicit foreign key hint
  console.log('\nStep 4: Trying with explicit foreign key hint...')

  const { data: fkMatches, error: fkError } = await supabase
    .from('news_contact_matches')
    .select(`
      news_article_id,
      news_articles!news_contact_matches_news_article_id_fkey (
        id,
        title,
        url,
        source,
        published_at,
        summary
      )
    `)
    .in('contact_id', contactIds)

  console.log(`  FK hint matches: ${fkMatches?.length || 0}`)
  if (fkError) {
    console.error('  Error:', fkError)
  } else if (fkMatches && fkMatches.length > 0) {
    console.log('\n✅ Articles found with FK hint:')
    fkMatches.forEach(m => {
      console.log(`  - [${m.news_articles?.source}] ${m.news_articles?.title}`)
    })
  }
}

testRLSIssue().catch(console.error)
