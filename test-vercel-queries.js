const { createClient } = require('@supabase/supabase-js')

// Use ANON key like the browser does
const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODQ0NjIsImV4cCI6MjA3MTI2MDQ2Mn0.DxQmHTxp10JmQJKP3FYRCi_dDNLOipLxNuB76mLQ_oE'
)

async function testQueries() {
  const extraWorkspaceId = 'decd6e7a-0ee1-4317-9192-be367c199055'
  
  console.log('=== TEST 1: MANDATES (should load ALL without workspace filter) ===')
  const { data: mandates, error: mandatesError } = await supabase
    .from('mandates')
    .select('*')
    .order('created_at', { ascending: false })
  
  console.log('Mandates:', mandates?.length || 0)
  console.log('Error:', mandatesError)
  if (mandates && mandates.length > 0) {
    console.log('First mandate buyer:', mandates[0].buyer)
  }
  
  console.log('\n=== TEST 2: CONTACTS in Extra Workspace ===')
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', extraWorkspaceId)
  
  console.log('Contacts:', contacts?.length || 0)
  console.log('Error:', contactsError)
  
  if (!contacts || contacts.length === 0) {
    console.log('\n❌ No contacts found - this is why Market Intelligence shows nothing')
    return
  }
  
  const contactIds = contacts.map(c => c.id)
  
  console.log('\n=== TEST 3: MARKET INTELLIGENCE (with news_article_id) ===')
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
  
  console.log('Matches:', matchData?.length || 0)
  console.log('Error:', matchError)
  
  if (matchData && matchData.length > 0) {
    console.log('\n✅ Sample article:')
    const article = matchData[0].news_articles
    console.log('  Title:', article?.title)
    console.log('  Source:', article?.source)
  }
}

testQueries().catch(console.error)
