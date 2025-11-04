const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkWorkspaceTerms() {
  console.log('=== WORKSPACE TRACKED TERMS CHECK ===\n')

  // Get all tracked terms with workspace info
  const { data: terms, error: termsError } = await supabase
    .from('tracked_terms')
    .select('id, term, workspace_id, match_count')

  if (termsError) {
    console.error('Error fetching terms:', termsError)
    return
  }

  console.log(`Found ${terms.length} tracked terms:\n`)

  // Group by workspace
  const byWorkspace = {}
  terms.forEach(term => {
    if (!byWorkspace[term.workspace_id]) {
      byWorkspace[term.workspace_id] = []
    }
    byWorkspace[term.workspace_id].push(term)
  })

  for (const [workspaceId, workspaceTerms] of Object.entries(byWorkspace)) {
    // Get workspace name
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    console.log(`Workspace: ${workspace?.name || 'Unknown'} (${workspaceId})`)
    console.log(`Terms: ${workspaceTerms.length}`)
    workspaceTerms.forEach(t => {
      console.log(`  - "${t.term}" (matches: ${t.match_count || 0})`)
    })
    console.log()
  }

  // Get all workspaces
  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name')

  console.log('\n=== ALL WORKSPACES ===')
  allWorkspaces.forEach(w => {
    console.log(`- ${w.name} (${w.id})`)
  })
}

checkWorkspaceTerms().catch(console.error)
