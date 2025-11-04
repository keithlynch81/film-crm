const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkRemaining() {
  const { data: remaining } = await supabase
    .from('news_articles')
    .select('id, title, summary')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')
    .limit(10)

  console.log(`Articles with entities: ${remaining?.length || 0}\n`)

  remaining?.forEach(a => {
    console.log(`Title: ${a.title}`)
    const entityMatches = a.title.match(/&#?\w+;/g)
    if (entityMatches) {
      console.log(`  Entities found: ${[...new Set(entityMatches)].join(', ')}`)
    }
    console.log()
  })
}

checkRemaining().catch(console.error)
