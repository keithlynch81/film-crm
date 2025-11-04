const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

function decodeNumericEntities(text) {
  return text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
}

async function finalClean() {
  console.log('=== FINAL HTML ENTITY CLEANUP ===\n')

  // Get all articles with remaining HTML entities
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

  for (const article of articles) {
    const cleanedTitle = decodeNumericEntities(article.title).replace(/&amp;/g, '&')
    const cleanedSummary = decodeNumericEntities(article.summary || '').replace(/&amp;/g, '&')

    const { error: updateError } = await supabase
      .from('news_articles')
      .update({
        title: cleanedTitle,
        summary: cleanedSummary
      })
      .eq('id', article.id)

    if (updateError) {
      console.error(`Error updating article ${article.id}:`, updateError)
    } else {
      cleaned++
      console.log(`${cleaned}/${articles.length}: Cleaned ${cleanedTitle.substring(0, 60)}...`)
    }
  }

  console.log(`\n✅ Final cleanup complete! Cleaned ${cleaned} articles`)

  // Final verification
  const { data: remaining } = await supabase
    .from('news_articles')
    .select('id, title')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')

  console.log(`\nArticles still containing HTML entities: ${remaining?.length || 0}`)

  if (remaining && remaining.length > 0) {
    console.log('\nRemaining entities (sample):')
    remaining.slice(0, 3).forEach(a => console.log(`  - ${a.title}`))
  } else {
    console.log('\n🎉 All HTML entities have been cleaned!')
  }
}

finalClean().catch(console.error)
