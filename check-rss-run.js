const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://zflxnfhqgzmfkpcilzqm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbHhuZmhxZ3ptZmtwY2lsenFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2NzQ5MiwiZXhwIjoyMDQwNDQzNDkyfQ.hVAo8RbYGpkR5Kx9r2FEcPy_ufhyODRKhgGKz0xPHe8'
)

async function checkRSSRun() {
  console.log('Checking RSS parsing activity...\n')

  // Get today's date at 6 AM
  const today = new Date()
  today.setHours(6, 0, 0, 0)
  const todayAt6AM = today.toISOString()

  // Get yesterday at 6 AM for comparison
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayAt6AM = yesterday.toISOString()

  console.log(`Today at 6 AM: ${todayAt6AM}`)
  console.log(`Yesterday at 6 AM: ${yesterdayAt6AM}\n`)

  // Check for articles added today after 6 AM
  const { data: todayArticles, error: todayError } = await supabase
    .from('news_articles')
    .select('id, title, source, created_at')
    .gte('created_at', todayAt6AM)
    .order('created_at', { ascending: false })

  if (todayError) {
    console.error('Error fetching today articles:', todayError)
  } else {
    console.log(`📰 Articles added TODAY after 6 AM: ${todayArticles.length}`)
    if (todayArticles.length > 0) {
      console.log('\nMost recent articles:')
      todayArticles.slice(0, 5).forEach(article => {
        console.log(`  - [${article.source}] ${article.title.substring(0, 60)}...`)
        console.log(`    Added: ${new Date(article.created_at).toLocaleString()}`)
      })
    }
  }

  // Check for articles added yesterday after 6 AM
  const { data: yesterdayArticles, error: yesterdayError } = await supabase
    .from('news_articles')
    .select('id, title, source, created_at')
    .gte('created_at', yesterdayAt6AM)
    .lt('created_at', todayAt6AM)
    .order('created_at', { ascending: false })

  if (yesterdayError) {
    console.error('Error fetching yesterday articles:', yesterdayError)
  } else {
    console.log(`\n📰 Articles added YESTERDAY after 6 AM: ${yesterdayArticles.length}`)
  }

  // Get total article count
  const { count, error: countError } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error getting total count:', countError)
  } else {
    console.log(`\n📊 Total articles in database: ${count}`)
  }

  // Check tracked term matches created today
  const { data: todayMatches, error: matchesError } = await supabase
    .from('tracked_term_matches')
    .select('id, created_at')
    .gte('created_at', todayAt6AM)

  if (matchesError) {
    console.error('Error fetching tracked term matches:', matchesError)
  } else {
    console.log(`\n🎯 Tracked term matches created TODAY after 6 AM: ${todayMatches.length}`)
  }

  // Check contact matches created today
  const { data: contactMatches, error: contactError } = await supabase
    .from('news_contact_matches')
    .select('id, created_at')
    .gte('created_at', todayAt6AM)

  if (contactError) {
    console.error('Error fetching contact matches:', contactError)
  } else {
    console.log(`📇 Contact matches created TODAY after 6 AM: ${contactMatches.length}`)
  }

  console.log('\n' + '='.repeat(60))

  if (todayArticles.length === 0) {
    console.log('\n⚠️  NO ARTICLES ADDED TODAY AFTER 6 AM')
    console.log('This could mean:')
    console.log('  1. EasyCron did not run')
    console.log('  2. The cron ran but failed')
    console.log('  3. There were no new articles in the RSS feeds')
    console.log('\nCheck your EasyCron dashboard for execution logs.')
  } else {
    console.log('\n✅ RSS parsing appears to be working!')
    console.log('Articles were successfully added to the database.')
  }
}

checkRSSRun().catch(console.error)
