const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function findTedSarandos() {
  console.log('=== FINDING TED SARANDOS ===\n')

  // Search for Ted Sarandos contact
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, workspace_id')
    .ilike('name', '%sarandos%')

  console.log(`Found ${contacts?.length || 0} contacts with "Sarandos" in name:\n`)

  for (const contact of contacts || []) {
    console.log(`Contact: ${contact.name}`)
    console.log(`  ID: ${contact.id}`)
    console.log(`  Workspace ID: ${contact.workspace_id}`)

    // Get workspace name
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', contact.workspace_id)
      .single()

    console.log(`  Workspace: ${workspace?.name || 'Unknown'}`)

    // Get article matches
    const { data: matches } = await supabase
      .from('news_contact_matches')
      .select(`
        article_id,
        news_articles (
          title,
          source
        )
      `)
      .eq('contact_id', contact.id)

    console.log(`  Article matches: ${matches?.length || 0}`)
    if (matches && matches.length > 0) {
      matches.forEach(m => {
        console.log(`    - [${m.news_articles?.source}] ${m.news_articles?.title}`)
      })
    }
    console.log()
  }
}

findTedSarandos().catch(console.error)
