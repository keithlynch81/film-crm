const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkArticles() {
  console.log('=== RECENT ARTICLES CHECK ===\n')

  // Get most recent articles
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('title, source, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${articles.length} recent articles:\n`)
  articles.forEach((article, i) => {
    console.log(`${i + 1}. [${article.source}] ${article.title}`)
    console.log(`   Summary: ${article.summary ? article.summary.substring(0, 100) + '...' : 'No summary'}`)
    console.log(`   Added: ${new Date(article.created_at).toLocaleString()}\n`)
  })

  // Check if any have Netflix
  const { data: netflixArticles, error: netflixError } = await supabase
    .from('news_articles')
    .select('title, source')
    .or('title.ilike.%Netflix%,summary.ilike.%Netflix%')
    .limit(5)

  if (!netflixError && netflixArticles.length > 0) {
    console.log(`\n📺 Found ${netflixArticles.length} articles mentioning Netflix:`)
    netflixArticles.forEach(a => console.log(`  - [${a.source}] ${a.title}`))
  } else {
    console.log('\n📺 No articles mention Netflix')
  }
}

checkArticles().catch(console.error)
