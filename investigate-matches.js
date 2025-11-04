const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function investigateMatches() {
  console.log('=== INVESTIGATING TRACKED TERM MATCHES ===\n')

  // First, get all tracked terms
  const { data: terms, error: termsError } = await supabase
    .from('tracked_terms')
    .select('id, term, workspace_id, match_count')
    .order('created_at', { ascending: false })

  console.log(`Total tracked terms: ${terms?.length || 0}`)
  terms?.forEach(t => {
    console.log(`  - "${t.term}" in workspace ${t.workspace_id} (match_count: ${t.match_count || 0})`)
  })

  // Get all matches (simple query)
  const { data: matches, error: matchesError } = await supabase
    .from('tracked_term_matches')
    .select('*')
    .order('matched_at', { ascending: false })

  console.log(`\nTotal tracked_term_matches records: ${matches?.length || 0}`)
  if (matches && matches.length > 0) {
    matches.forEach((m, i) => {
      console.log(`\n${i + 1}. Match ID: ${m.id}`)
      console.log(`   Term ID: ${m.term_id}`)
      console.log(`   Article ID: ${m.article_id}`)
      console.log(`   Matched: ${new Date(m.matched_at).toLocaleString()}`)
    })
  }

  // Now check the Netflix case - should appear in two workspaces
  console.log('\n=== NETFLIX SPECIFIC CHECK ===')

  const netflixTerms = terms?.filter(t => t.term.toLowerCase() === 'netflix')
  console.log(`\nNetflix tracked in ${netflixTerms?.length || 0} workspaces:`)
  netflixTerms?.forEach(t => {
    console.log(`  - Workspace: ${t.workspace_id}, Term ID: ${t.id}, Match count: ${t.match_count || 0}`)
  })

  // Get matches for each Netflix term
  for (const term of netflixTerms || []) {
    const { data: termMatches } = await supabase
      .from('tracked_term_matches')
      .select('article_id, matched_at')
      .eq('term_id', term.id)

    console.log(`\n  Matches for Netflix in workspace ${term.workspace_id}: ${termMatches?.length || 0}`)
    termMatches?.forEach(m => console.log(`    - Article ${m.article_id}`))
  }

  // Check if any articles mention Netflix
  const { data: netflixArticles } = await supabase
    .from('news_articles')
    .select('id, title, source')
    .or('title.ilike.%netflix%,summary.ilike.%netflix%')
    .limit(5)

  console.log(`\n=== ARTICLES MENTIONING NETFLIX ===`)
  console.log(`Found ${netflixArticles?.length || 0} articles with "Netflix":`)
  netflixArticles?.forEach(a => console.log(`  - [${a.source}] ${a.title}`))
}

investigateMatches().catch(console.error)
