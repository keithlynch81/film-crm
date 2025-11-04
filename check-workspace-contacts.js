const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkWorkspaceContacts() {
  console.log('=== CHECKING CONTACTS BY WORKSPACE ===\n')

  const workspaces = [
    { id: 'e6af33ea-7b8f-476f-afae-d88f40fa5413', name: 'The Lynch Brothers' },
    { id: 'decd6e7a-0ee1-4317-9192-be367c199055', name: 'Extra Workspace' }
  ]

  for (const workspace of workspaces) {
    console.log(`\n${workspace.name} (${workspace.id.substring(0, 8)}...):`)

    // Get contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', workspace.id)

    console.log(`  Contacts: ${contacts?.length || 0}`)
    if (contacts && contacts.length > 0) {
      contacts.slice(0, 5).forEach(c => console.log(`    - ${c.name} (${c.id.substring(0, 8)}...)`))
      if (contacts.length > 5) {
        console.log(`    ... and ${contacts.length - 5} more`)
      }
    }

    // Get article matches for those contacts
    const contactIds = contacts?.map(c => c.id) || []

    if (contactIds.length > 0) {
      const { data: matches } = await supabase
        .from('news_contact_matches')
        .select('contact_id, article_id')
        .in('contact_id', contactIds)

      console.log(`  Article matches: ${matches?.length || 0}`)

      // Check for Ted Sarandos specifically
      const tedContact = contacts?.find(c => c.name.toLowerCase().includes('sarandos'))
      if (tedContact) {
        const { data: tedMatches } = await supabase
          .from('news_contact_matches')
          .select(`
            article_id,
            news_articles (
              title
            )
          `)
          .eq('contact_id', tedContact.id)

        console.log(`\n  Ted Sarandos matches: ${tedMatches?.length || 0}`)
        tedMatches?.forEach(m => {
          console.log(`    - ${m.news_articles?.title}`)
        })
      }
    } else {
      console.log(`  ⚠️  No contacts in this workspace - Market Intelligence will show "No articles found"`)
    }
  }
}

checkWorkspaceContacts().catch(console.error)
