const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testLoadTrackedTerms() {
  const workspaceId = 'e6af33ea-7b8f-476f-afae-d88f40fa5413' // The Lynch Brothers

  console.log('=== LOADING TRACKED TERMS ===\n')
  console.log(`Workspace: The Lynch Brothers (${workspaceId})\n`)

  // Load exactly like the page does
  const { data, error } = await supabase
    .from('tracked_terms')
    .select(`
      *,
      tracked_term_matches (
        article_id,
        matched_at,
        news_articles (
          id,
          title,
          url,
          source,
          published_at,
          content_snippet
        )
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Found ${data.length} tracked terms:\n`)
    data.forEach((term, i) => {
      const matches = term.tracked_term_matches || []
      console.log(`${i + 1}. "${term.term}" (${term.term_type})`)
      console.log(`   ID: ${term.id}`)
      console.log(`   Match count: ${term.match_count || 0}`)
      console.log(`   Actual matches in DB: ${matches.length}`)
      console.log(`   Created: ${new Date(term.created_at).toLocaleString()}`)
      console.log()
    })
  }
}

testLoadTrackedTerms().catch(console.error)
