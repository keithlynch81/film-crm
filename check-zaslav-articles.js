const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkZaslavArticles() {
  console.log('=== SEARCHING FOR ZASLAV ===\n')

  // Search all articles for Zaslav in title
  const { data: titleMatches, error: titleError } = await supabase
    .from('news_articles')
    .select('id, title, source, summary')
    .ilike('title', '%Zaslav%')
    .order('created_at', { ascending: false })

  console.log(`Articles with "Zaslav" in TITLE: ${titleMatches?.length || 0}`)
  if (titleMatches && titleMatches.length > 0) {
    titleMatches.forEach(a => {
      console.log(`  - [${a.source}] ${a.title}`)
    })
  }

  // Search all articles for Zaslav in summary
  const { data: summaryMatches, error: summaryError } = await supabase
    .from('news_articles')
    .select('id, title, source, summary')
    .ilike('summary', '%Zaslav%')
    .order('created_at', { ascending: false })

  console.log(`\nArticles with "Zaslav" in SUMMARY: ${summaryMatches?.length || 0}`)
  if (summaryMatches && summaryMatches.length > 0) {
    summaryMatches.slice(0, 3).forEach(a => {
      console.log(`  - [${a.source}] ${a.title}`)
      console.log(`    Summary: ${a.summary?.substring(0, 100)}...`)
    })
  }

  // Check notifications for tracked term matches
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('notification_type', 'tracked_term_match')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`\n=== NOTIFICATIONS ===`)
  console.log(`Tracked term match notifications: ${notifications?.length || 0}`)
  if (notifications && notifications.length > 0) {
    notifications.forEach(n => {
      console.log(`  - ${n.message}`)
      console.log(`    Created: ${new Date(n.created_at).toLocaleString()}`)
    })
  }

  // Check for HTML entities in article titles
  const { data: recentArticles } = await supabase
    .from('news_articles')
    .select('title')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log(`\n=== SAMPLE ARTICLE TITLES (checking for HTML entities) ===`)
  recentArticles?.forEach((a, i) => {
    console.log(`${i + 1}. ${a.title}`)
    if (a.title.includes('&#')) {
      console.log('   ⚠️  Contains HTML entities!')
    }
  })
}

checkZaslavArticles().catch(console.error)
