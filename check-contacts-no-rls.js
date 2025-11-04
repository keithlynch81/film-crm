const { createClient } = require('@supabase/supabase-js')

// Use service role to bypass RLS
const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

async function checkContactsDirectly() {
  console.log('=== CHECKING CONTACTS (BYPASSING RLS) ===\n')

  try {
    // Try direct SQL-style query
    const { data, error, count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(10)

    console.log('Query result:')
    console.log('  Error:', error)
    console.log('  Count:', count)
    console.log('  Data length:', data?.length)

    if (data && data.length > 0) {
      console.log('\nFirst few contacts:')
      data.slice(0, 5).forEach(c => {
        console.log(`  - ${c.name} (${c.workspace_id})`)
      })
    }

    // Check Extra Workspace specifically
    const extraWorkspaceId = 'decd6e7a-0ee1-4317-9192-be367c199055'
    const { data: extraContacts } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', extraWorkspaceId)

    console.log(`\n=== EXTRA WORKSPACE CONTACTS ===`)
    console.log(`Count: ${extraContacts?.length || 0}`)
    if (extraContacts && extraContacts.length > 0) {
      extraContacts.forEach(c => console.log(`  - ${c.name}`))
    }

    // Check The Lynch Brothers workspace
    const lynchWorkspaceId = 'e6af33ea-7b8f-476f-afae-d88f40fa5413'
    const { data: lynchContacts } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', lynchWorkspaceId)

    console.log(`\n=== THE LYNCH BROTHERS CONTACTS ===`)
    console.log(`Count: ${lynchContacts?.length || 0}`)
    if (lynchContacts && lynchContacts.length > 0) {
      lynchContacts.slice(0, 10).forEach(c => console.log(`  - ${c.name}`))
      if (lynchContacts.length > 10) {
        console.log(`  ... and ${lynchContacts.length - 10} more`)
      }
    }

  } catch (err) {
    console.error('Exception:', err)
  }
}

checkContactsDirectly().catch(console.error)
