const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testNotificationCreation() {
  console.log('=== TESTING NOTIFICATION CREATION ===\n')

  // Test creating a notification for the Extra Workspace Netflix match
  const workspace_id = 'decd6e7a-0ee1-4317-9192-be367c199055' // Extra Workspace
  const user_id = '042482f2-9cfd-4495-9b56-82c62d7defad' // Owner

  console.log('Attempting to create notification...')
  console.log(`  Workspace: ${workspace_id}`)
  console.log(`  User: ${user_id}\n`)

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: workspace_id,
      user_id: user_id,
      title: 'Tracked Term Match',
      message: 'New article matches tracked term "Netflix": The Witcher Season 4',
      action_type: 'view',
      entity_type: 'tracked_term_match',
      entity_id: 'dfa81e4d-aad1-453a-a609-6342b1256f82', // Match ID
      entity_title: 'Netflix',
      is_read: false
    })
    .select()

  if (error) {
    console.error('❌ Error creating notification:', error)
  } else {
    console.log('✅ Notification created successfully!')
    console.log('   Data:', data)
  }

  // Check if notification appears in queries
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false })

  console.log(`\n=== NOTIFICATIONS FOR EXTRA WORKSPACE ===`)
  console.log(`Found ${notifications?.length || 0} notifications`)
  notifications?.forEach(n => {
    console.log(`  - ${n.message || n.title}`)
    console.log(`    Type: ${n.entity_type || 'N/A'}`)
    console.log(`    Created: ${new Date(n.created_at).toLocaleString()}`)
  })
}

testNotificationCreation().catch(console.error)
