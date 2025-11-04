const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODQ0NjIsImV4cCI6MjA3MTI2MDQ2Mn0.BVyzkd-KWsOAHM3qzFx98-DschS6IOmwsmQwBrz8DaA'
)

async function test() {
  console.log('=== TEST 1: MANDATES (global, no workspace filter) ===')
  const { data: mandates, error: e1 } = await supabase
    .from('mandates')
    .select('*')
  
  console.log('Count:', mandates?.length, 'Error:', e1?.message || 'none')
  if (mandates?.[0]) console.log('First:', mandates[0].buyer)
  
  console.log('\n=== TEST 2: MARKET INTELLIGENCE ===')
  const extraWorkspace = 'decd6e7a-0ee1-4317-9192-be367c199055'
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', extraWorkspace)
  
  console.log('Contacts:', contacts?.length)
  
  if (contacts?.length) {
    const { data: matches, error: e2 } = await supabase
      .from('news_contact_matches')
      .select(`
        news_article_id,
        news_articles!news_contact_matches_news_article_id_fkey (
          id, title, source
        )
      `)
      .in('contact_id', contacts.map(c => c.id))
      .limit(5)
    
    console.log('Matches:', matches?.length, 'Error:', e2?.message || 'none')
    if (matches?.[0]?.news_articles) {
      console.log('Sample:', matches[0].news_articles.title)
    }
  }
}

test().catch(console.error)
