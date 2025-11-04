const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testTrackedTerms() {
  console.log('=== TRACKED TERMS TEST ===\n')

  // Check tracked terms
  const { data: terms, error: termsError } = await supabase
    .from('tracked_terms')
    .select('*')

  if (termsError) {
    console.error('Error fetching tracked terms:', termsError)
  } else {
    console.log(`📋 Tracked terms: ${terms.length}`)
    terms.forEach(term => {
      console.log(`  - "${term.term}" (ID: ${term.id}, matches: ${term.match_count || 0})`)
    })
  }

  // Check articles with "Zaslav" in title or summary
  const { data: articles, error: articlesError } = await supabase
    .from('news_articles')
    .select('id, title, summary, source')
    .or('title.ilike.%Zaslav%,summary.ilike.%Zaslav%')
    .limit(5)

  if (articlesError) {
    console.error('\nError fetching articles:', articlesError)
  } else {
    console.log(`\n📰 Articles mentioning "Zaslav": ${articles.length}`)
    articles.forEach(article => {
      console.log(`  - [${article.source}] ${article.title.substring(0, 80)}...`)
    })
  }

  // Check tracked term matches
  const { data: matches, error: matchesError } = await supabase
    .from('tracked_term_matches')
    .select('*')

  if (matchesError) {
    console.error('\nError fetching matches:', matchesError)
  } else {
    console.log(`\n🎯 Total tracked term matches: ${matches.length}`)
  }

  // Check total articles
  const { count, error: countError } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('\nError getting article count:', countError)
  } else {
    console.log(`\n📊 Total articles in database: ${count}`)
  }
}

testTrackedTerms().catch(console.error)
