const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function cleanArticles() {
  console.log('=== CLEANING HTML ENTITIES FROM EXISTING ARTICLES ===\n')

  // Get all articles with HTML entities
  const { data: articles, error: fetchError } = await supabase
    .from('news_articles')
    .select('id, title, summary')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')

  if (fetchError) {
    console.error('Error fetching articles:', fetchError)
    return
  }

  console.log(`Found ${articles.length} articles with HTML entities\n`)

  let cleaned = 0
  let errors = 0

  for (const article of articles) {
    const cleanedTitle = article.title
      .replace(/&#039;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8230;/g, '…')
      .replace(/&amp;/g, '&')

    const cleanedSummary = (article.summary || '')
      .replace(/&#039;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8230;/g, '…')
      .replace(/&amp;/g, '&')

    const { error: updateError } = await supabase
      .from('news_articles')
      .update({
        title: cleanedTitle,
        summary: cleanedSummary
      })
      .eq('id', article.id)

    if (updateError) {
      console.error(`Error updating article ${article.id}:`, updateError)
      errors++
    } else {
      cleaned++
      if (cleaned % 10 === 0) {
        console.log(`Cleaned ${cleaned}/${articles.length} articles...`)
      }
    }
  }

  console.log(`\n✅ Cleaning complete!`)
  console.log(`   Cleaned: ${cleaned}`)
  console.log(`   Errors: ${errors}`)

  // Verify results
  console.log('\n=== VERIFYING RESULTS ===\n')

  const { data: remaining } = await supabase
    .from('news_articles')
    .select('id, title')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')
    .limit(5)

  console.log(`Articles still containing HTML entities: ${remaining?.length || 0}`)
  if (remaining && remaining.length > 0) {
    remaining.forEach(a => console.log(`  - ${a.title}`))
  }

  const { data: sample } = await supabase
    .from('news_articles')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\nSample of recent article titles:')
  sample?.forEach((a, i) => console.log(`  ${i + 1}. ${a.title}`))
}

cleanArticles().catch(console.error)
