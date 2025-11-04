const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkAllContactMatches() {
  console.log('=== ALL CONTACTS IN DATABASE ===\n')

  // Get all contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, workspace_id')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log(`Total contacts (last 20): ${contacts?.length || 0}\n`)

  for (const contact of contacts || []) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', contact.workspace_id)
      .single()

    console.log(`${contact.name} (${workspace?.name || 'Unknown workspace'})`)

    // Get matches
    const { data: matches } = await supabase
      .from('news_contact_matches')
      .select('article_id')
      .eq('contact_id', contact.id)

    console.log(`  Matches: ${matches?.length || 0}`)
  }

  // Now check article matches without contacts
  console.log('\n=== CHECKING ARTICLE MATCHES TABLE ===\n')

  const { data: allMatches } = await supabase
    .from('news_contact_matches')
    .select('contact_id, article_id')
    .limit(10)

  console.log(`Total news_contact_matches records (sample): ${allMatches?.length || 0}`)
  if (allMatches && allMatches.length > 0) {
    console.log('\nSample matches:')
    for (const match of allMatches) {
      console.log(`  Contact ${match.contact_id.substring(0, 8)}... → Article ${match.article_id.substring(0, 8)}...`)
    }
  }
}

checkAllContactMatches().catch(console.error)
