const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function cleanRemainingEntities() {
  console.log('=== CLEANING REMAINING HTML ENTITIES (&#038;) ===\n')

  // Get all articles with &#038; entities
  const { data: articles, error: fetchError } = await supabase
    .from('news_articles')
    .select('id, title, summary')
    .or('title.like.%&#038;%,summary.like.%&#038;%')

  if (fetchError) {
    console.error('Error fetching articles:', fetchError)
    return
  }

  console.log(`Found ${articles.length} articles with &#038; entities\n`)

  for (const article of articles) {
    const cleanedTitle = article.title.replace(/&#038;/g, '&')
    const cleanedSummary = (article.summary || '').replace(/&#038;/g, '&')

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
      console.log(`Cleaned: ${cleanedTitle}`)
    }
  }

  console.log(`\n✅ Cleaning complete!`)

  // Verify no entities remain
  const { data: remaining } = await supabase
    .from('news_articles')
    .select('id, title')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')

  console.log(`\nArticles still containing HTML entities: ${remaining?.length || 0}`)
}

cleanRemainingEntities().catch(console.error)
