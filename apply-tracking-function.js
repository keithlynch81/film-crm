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

async function applyFunction() {
  const sql = fs.readFileSync('/home/keith/match-tracked-terms-function.sql', 'utf8')

  console.log('Applying tracked terms matching function...')
  console.log('SQL length:', sql.length)

  // Try to execute the whole SQL at once
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Success! Tracked terms matching system is now active.')
      console.log('- New articles will automatically be matched to tracked terms')
      console.log('- Use match_tracked_terms_to_articles() to match existing articles')
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

applyFunction().catch(console.error)
