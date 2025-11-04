const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://hqefgtuczwjffuydjwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE'
)

async function checkSummaries() {
  const { data: remaining } = await supabase
    .from('news_articles')
    .select('id, title, summary')
    .or('title.like.%&#%,summary.like.%&#%,title.like.%&amp;%,summary.like.%&amp;%')
    .limit(5)

  console.log(`Articles with entities: ${remaining?.length || 0}\n`)

  remaining?.forEach(a => {
    console.log(`Title: ${a.title}`)

    const titleEntities = a.title.match(/&#?\w+;|&amp;/g)
    if (titleEntities) {
      console.log(`  Title entities: ${[...new Set(titleEntities)].join(', ')}`)
    }

    const summaryEntities = (a.summary || '').match(/&#?\w+;|&amp;/g)
    if (summaryEntities) {
      console.log(`  Summary entities: ${[...new Set(summaryEntities)].slice(0, 5).join(', ')}`)
      console.log(`  Summary preview: ${a.summary?.substring(0, 150)}...`)
    }
    console.log()
  })
}

checkSummaries().catch(console.error)
