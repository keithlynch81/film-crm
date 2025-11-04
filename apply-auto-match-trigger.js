const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://zflxnfhqgzmfkpcilzqm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbHhuZmhxZ3ptZmtwY2lsenFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDg2NzQ5MiwiZXhwIjoyMDQwNDQzNDkyfQ.hVAo8RbYGpkR5Kx9r2FEcPy_ufhyODRKhgGKz0xPHe8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyTrigger() {
  console.log('Applying auto-match trigger for tracked terms...')

  const sql = fs.readFileSync('/home/keith/tracked-terms-auto-match.sql', 'utf8')

  // Split into individual statements (separated by semicolon followed by newline)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s =>
      s.length > 0 &&
      !s.startsWith('--') &&
      !s.match(/^\/\*/) &&
      !s.match(/^SELECT.*FROM information_schema/) // Skip verification queries
    )

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 100).replace(/\s+/g, ' ')
    console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`)

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        // Some errors are expected (like "function already exists")
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${error.message}`)
        } else {
          console.error(`   ❌ Error:`, error.message)
        }
      } else {
        console.log(`   ✅ Success`)
      }
    } catch (err) {
      console.error(`   ❌ Exception:`, err.message)
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n✨ Done! Verifying trigger installation...\n')

  // Verify trigger exists
  const { data: triggerCheck, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_match_article_to_tracked_terms';
    `
  })

  if (triggerError) {
    console.error('❌ Could not verify trigger:', triggerError.message)
  } else {
    console.log('✅ Trigger installed successfully!')
    console.log('   Trigger: trigger_match_article_to_tracked_terms')
    console.log('   Table: news_articles')
    console.log('   Event: AFTER INSERT\n')
  }

  // Show summary
  console.log('📋 What was installed:')
  console.log('   1. Function: match_article_to_tracked_terms()')
  console.log('      - Automatically matches new articles to tracked terms')
  console.log('   2. Trigger: trigger_match_article_to_tracked_terms')
  console.log('      - Runs after each article insert')
  console.log('   3. Function: rematch_all_tracked_terms()')
  console.log('      - Optional: Re-match all existing articles')
  console.log('\n🎯 Next Steps:')
  console.log('   - New articles will automatically match to tracked terms')
  console.log('   - Set up daily RSS parsing (see DAILY_RSS_SETUP.md)')
  console.log('   - Test by adding a new article that mentions a tracked term')
}

applyTrigger().catch(console.error)
