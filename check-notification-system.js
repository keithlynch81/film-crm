const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkNotificationSystem() {
  console.log('=== INVESTIGATING NOTIFICATION SYSTEM ===\n')

  // Check tracked_term_matches
  const { data: matches } = await supabase
    .from('tracked_term_matches')
    .select(`
      id,
      matched_at,
      tracked_terms (
        term,
        workspace_id,
        workspace_members!inner (
          user_id
        )
      ),
      news_articles (
        title
      )
    `)
    .order('matched_at', { ascending: false })
    .limit(10)

  console.log(`Recent tracked term matches: ${matches?.length || 0}`)
  if (matches && matches.length > 0) {
    matches.forEach((m, i) => {
      console.log(`\n${i + 1}. Match ID: ${m.id}`)
      console.log(`   Article: ${m.news_articles?.title}`)
      console.log(`   Term: ${m.tracked_terms?.term}`)
      console.log(`   Workspace: ${m.tracked_terms?.workspace_id}`)
      console.log(`   Matched: ${new Date(m.matched_at).toLocaleString()}`)
    })
  }

  // Check for notifications related to tracked terms
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

  // Check all notification types
  const { data: allNotifications } = await supabase
    .from('notifications')
    .select('notification_type')

  console.log(`\n=== ALL NOTIFICATION TYPES IN DATABASE ===`)
  const types = [...new Set(allNotifications?.map(n => n.notification_type) || [])]
  console.log(`Notification types found: ${types.join(', ')}`)

  // Count by type
  const typeCounts = {}
  allNotifications?.forEach(n => {
    typeCounts[n.notification_type] = (typeCounts[n.notification_type] || 0) + 1
  })
  console.log('\nCounts by type:')
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`)
  })
}

checkNotificationSystem().catch(console.error)
