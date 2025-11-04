const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function createMissingNotifications() {
  console.log('=== CREATING NOTIFICATIONS FOR EXISTING MATCHES ===\n')

  // Get all tracked term matches with their related data
  const { data: matches, error } = await supabase
    .from('tracked_term_matches')
    .select(`
      id,
      tracked_term_id,
      article_id,
      matched_at
    `)
    .order('matched_at', { ascending: false })

  if (error) {
    console.error('Error fetching matches:', error)
    return
  }

  console.log(`Found ${matches?.length || 0} total matches\n`)

  let notificationsCreated = 0
  let skipped = 0

  for (const match of matches || []) {
    // Get tracked term info
    const { data: term } = await supabase
      .from('tracked_terms')
      .select('id, term, workspace_id')
      .eq('id', match.tracked_term_id)
      .single()

    if (!term) {
      console.log(`  ⚠️  Match ${match.id}: No tracked term found`)
      skipped++
      continue
    }

    // Get article info
    const { data: article } = await supabase
      .from('news_articles')
      .select('id, title')
      .eq('id', match.article_id)
      .single()

    if (!article) {
      console.log(`  ⚠️  Match ${match.id}: No article found`)
      skipped++
      continue
    }

    // Get workspace members
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', term.workspace_id)

    if (!members || members.length === 0) {
      console.log(`  ⚠️  Match ${match.id}: No workspace members found`)
      skipped++
      continue
    }

    // Create notification for each member
    for (const member of members) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          workspace_id: term.workspace_id,
          user_id: member.user_id,
          title: 'Tracked Term Match',
          message: `New article matches tracked term "${term.term}": ${article.title}`,
          action_type: 'view',
          entity_type: 'tracked_term_match',
          entity_id: match.id,
          entity_title: term.term,
          is_read: false
        })

      if (notifError) {
        // Likely already exists, skip
        if (!notifError.message.includes('duplicate')) {
          console.error(`    Error creating notification:`, notifError.message)
        }
      } else {
        notificationsCreated++
      }
    }

    console.log(`  ✓ Created notifications for "${term.term}" match: ${article.title.substring(0, 50)}...`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Notifications created: ${notificationsCreated}`)
  console.log(`Matches skipped: ${skipped}`)
  console.log(`\n✅ Done!`)
}

createMissingNotifications().catch(console.error)
