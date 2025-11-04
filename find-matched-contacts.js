const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function findMatchedContacts() {
  console.log('=== FINDING CONTACTS WITH MATCHES ===\n')

  // Get all matches
  const { data: matches } = await supabase
    .from('news_contact_matches')
    .select('contact_id, news_article_id, matched_text')

  console.log(`Total matches: ${matches?.length || 0}\n`)

  // Get unique contact IDs
  const contactIds = [...new Set(matches?.map(m => m.contact_id) || [])]
  console.log(`Unique contacts with matches: ${contactIds.length}\n`)

  // Look up each contact
  for (const contactId of contactIds) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, workspace_id')
      .eq('id', contactId)
      .single()

    if (contact) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', contact.workspace_id)
        .single()

      const contactMatches = matches?.filter(m => m.contact_id === contactId) || []

      console.log(`Contact: ${contact.first_name} ${contact.last_name}`)
      console.log(`  ID: ${contact.id}`)
      console.log(`  Workspace: ${workspace?.name || 'Unknown'} (${contact.workspace_id})`)
      console.log(`  Matches: ${contactMatches.length}`)
      contactMatches.forEach(m => {
        console.log(`    - Matched text: "${m.matched_text}"`)
      })
      console.log()
    } else {
      console.log(`⚠️  Contact ${contactId} not found (may have been deleted)`)
      console.log()
    }
  }
}

findMatchedContacts().catch(console.error)
