const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkWorkspaceMembers() {
  // Get all workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  console.log(`=== WORKSPACE MEMBERS ===\n`)

  for (const workspace of workspaces || []) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspace.id)

    console.log(`${workspace.name} (${workspace.id}):`)
    console.log(`  Members: ${members?.length || 0}`)
    if (members && members.length > 0) {
      members.forEach(m => console.log(`    - User ${m.user_id} (${m.role})`))
    }
    console.log()
  }

  // Check notification table structure
  const { data: sample, error } = await supabase
    .from('notifications')
    .select('*')
    .limit(1)

  console.log(`=== NOTIFICATIONS TABLE ===`)
  if (error) {
    console.error('Error querying notifications:', error)
  } else if (sample && sample.length > 0) {
    console.log('Sample notification structure:', Object.keys(sample[0]))
  } else {
    console.log('No notifications exist yet')
  }
}

checkWorkspaceMembers().catch(console.error)
