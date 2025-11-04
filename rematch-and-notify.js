const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function rematchAndNotify() {
  console.log('=== REMATCHING TRACKED TERMS AND CREATING NOTIFICATIONS ===\n')

  // Get all tracked terms across all workspaces
  const { data: terms } = await supabase
    .from('tracked_terms')
    .select('id, term, workspace_id')
    .order('created_at', { ascending: true })

  console.log(`Found ${terms?.length || 0} tracked terms\n`)

  let totalMatches = 0
  let totalNotifications = 0

  // Get all articles (recent 30 days)
  const { data: articles } = await supabase
    .from('news_articles')
    .select('id, title, summary')
    .order('published_at', { ascending: false })
    .limit(300)

  console.log(`Checking ${articles?.length || 0} recent articles\n`)

  for (const term of terms || []) {
    console.log(`\nProcessing term: "${term.term}" in workspace ${term.workspace_id.substring(0, 8)}...`)
    let termMatches = 0

    for (const article of articles || []) {
      const titleMatch = article.title?.toLowerCase().includes(term.term.toLowerCase())
      const summaryMatch = article.summary?.toLowerCase().includes(term.term.toLowerCase())

      if (titleMatch || summaryMatch) {
        // Try to insert match
        const { data: match, error } = await supabase
          .from('tracked_term_matches')
          .insert({
            tracked_term_id: term.id,
            article_id: article.id,
            confidence: 0.80
          })
          .select()
          .single()

        if (!error) {
          // New match created!
          termMatches++
          totalMatches++
          console.log(`  ✓ New match: ${article.title.substring(0, 60)}...`)

          // Get all workspace members for notifications
          const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', term.workspace_id)

          // Create notification for each member
          for (const member of members || []) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: member.user_id,
                workspace_id: term.workspace_id,
                notification_type: 'tracked_term_match',
                message: `New article matches tracked term "${term.term}": ${article.title}`,
                link: '/industry',
                is_read: false
              })

            if (!notifError) {
              totalNotifications++
            }
          }
        } else if (!error.message.includes('duplicate key')) {
          // Only log if it's not a duplicate error
          console.error(`  Error creating match:`, error.message)
        }
      }
    }

    // Update match count
    const { data: countData } = await supabase
      .from('tracked_term_matches')
      .select('id', { count: 'exact' })
      .eq('tracked_term_id', term.id)

    await supabase
      .from('tracked_terms')
      .update({
        match_count: countData?.length || 0,
        last_match_at: termMatches > 0 ? new Date().toISOString() : null
      })
      .eq('id', term.id)

    console.log(`  Total matches for "${term.term}": ${countData?.length || 0}`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`New matches created: ${totalMatches}`)
  console.log(`Notifications created: ${totalNotifications}`)
  console.log(`\n✅ Rematch complete!`)
}

rematchAndNotify().catch(console.error)
