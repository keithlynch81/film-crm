const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testIndustryQuery() {
  const workspaceId = 'e6af33ea-7b8f-476f-afae-d88f40fa5413' // The Lynch Brothers

  console.log('=== TESTING INDUSTRY PAGE QUERY ===\n')
  console.log(`Testing with workspace: ${workspaceId}\n`)

  // Step 1: Get contacts for workspace
  console.log('Step 1: Getting contacts for workspace...')
  const { data: contactData, error: contactError } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('workspace_id', workspaceId)

  console.log(`  Found ${contactData?.length || 0} contacts`)
  if (contactError) {
    console.error('  Error:', contactError)
  }
  if (contactData && contactData.length > 0) {
    contactData.slice(0, 5).forEach(c => {
      console.log(`    - ${c.first_name} ${c.last_name} (${c.id.substring(0, 8)}...)`)
    })
  }

  if (!contactData || contactData.length === 0) {
    console.log('\n⚠️  No contacts found - this is why Market Intelligence shows "No articles found"')
    return
  }

  const contactIds = contactData.map(c => c.id)
  console.log(`\nStep 2: Getting article matches for ${contactIds.length} contacts...`)

  // Step 2: Try the NEW query with correct column name
  const { data: matchData, error: matchError } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(100)

  console.log(`  Found ${matchData?.length || 0} matches`)
  if (matchError) {
    console.error('  Error:', matchError)
  } else {
    console.log('\nStep 3: Processing matches...')
    const uniqueArticles = new Map()
    matchData?.forEach((match) => {
      const article = match.news_articles
      if (article && !uniqueArticles.has(article.id)) {
        uniqueArticles.set(article.id, article)
      }
    })

    console.log(`  Unique articles: ${uniqueArticles.size}`)

    if (uniqueArticles.size > 0) {
      console.log('\n=== ARTICLES THAT SHOULD APPEAR ===\n')
      Array.from(uniqueArticles.values()).forEach(a => {
        console.log(`  - [${a.source}] ${a.title}`)
      })
    }
  }
}

testIndustryQuery().catch(console.error)
