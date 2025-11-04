const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testManualMatch() {
  console.log('=== MANUAL MATCHING TEST ===\n')

  // Get Netflix tracked term
  const { data: netflixTerm } = await supabase
    .from('tracked_terms')
    .select('*')
    .eq('term', 'Netflix')
    .limit(1)
    .single()

  if (!netflixTerm) {
    console.log('No Netflix tracked term found')
    return
  }

  console.log(`Found tracked term: "${netflixTerm.term}" (ID: ${netflixTerm.id})`)

  // Get the Netflix article
  const { data: netflixArticle } = await supabase
    .from('news_articles')
    .select('*')
    .or('title.ilike.%Netflix%,summary.ilike.%Netflix%')
    .limit(1)
    .single()

  if (!netflixArticle) {
    console.log('No Netflix article found')
    return
  }

  console.log(`\nFound article: "${netflixArticle.title}"`)
  console.log(`Summary: ${netflixArticle.summary ? netflixArticle.summary.substring(0, 100) : 'None'}`)

  // Manually create a match
  console.log(`\n🔧 Manually creating match between term and article...`)

  const { data: match, error } = await supabase
    .from('tracked_term_matches')
    .insert({
      tracked_term_id: netflixTerm.id,
      article_id: netflixArticle.id,
      confidence: 0.90
    })
    .select()

  if (error) {
    console.error('Error creating match:', error)
  } else {
    console.log('✅ Match created successfully:', match)

    // Update tracked term count
    const { error: updateError } = await supabase
      .from('tracked_terms')
      .update({
        match_count: 1,
        last_match_at: new Date().toISOString()
      })
      .eq('id', netflixTerm.id)

    if (!updateError) {
      console.log('✅ Updated tracked term match count')
    }
  }
}

testManualMatch().catch(console.error)
