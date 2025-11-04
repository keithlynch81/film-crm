const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function testInsert() {
  console.log('Testing article insert...\n')

  const testArticle = {
    title: 'Test Article from Variety',
    summary: 'This is a test summary',
    url: `https://variety.com/test/${Date.now()}`,
    published_at: new Date().toISOString(),
    source: 'variety',
    is_processed: false
  }

  console.log('Inserting:', testArticle)

  const { data, error } = await supabaseAdmin
    .from('news_articles')
    .insert(testArticle)
    .select()

  if (error) {
    console.error('\n❌ Error:', error)
  } else {
    console.log('\n✅ Success:', data)
  }
}

testInsert().catch(console.error)
