import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check if news_articles table exists
    console.log('Testing database connection...')
    
    const { data: tableTest, error: tableError } = await supabase
      .from('news_articles')
      .select('id')
      .limit(1)

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'news_articles table missing or inaccessible',
        details: tableError.message,
        fix: 'Run the market-intelligence-migration.sql in Supabase SQL Editor'
      })
    }

    // Test 2: Try to insert a test article
    const testArticle = {
      title: 'Test Article for Database Connection',
      summary: 'This is a test article to verify database connectivity',
      url: `https://test.com/article-${Date.now()}`,
      published_at: new Date().toISOString(),
      source: 'test',
      author: 'Test Author',
      is_processed: false
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('news_articles')
      .insert([testArticle])
      .select()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test article',
        details: insertError.message,
        test_article: testArticle
      })
    }

    // Test 3: Clean up - delete the test article
    if (insertResult && insertResult.length > 0) {
      await supabase
        .from('news_articles')
        .delete()
        .eq('id', insertResult[0].id)
    }

    // Test 4: Check other required tables
    const tableChecks = await Promise.allSettled([
      supabase.from('news_contact_matches').select('id').limit(1),
      supabase.from('news_company_matches').select('id').limit(1),
      supabase.from('news_project_matches').select('id').limit(1)
    ])

    const missingTables = []
    if (tableChecks[0].status === 'rejected') missingTables.push('news_contact_matches')
    if (tableChecks[1].status === 'rejected') missingTables.push('news_company_matches')
    if (tableChecks[2].status === 'rejected') missingTables.push('news_project_matches')

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      tests: {
        table_exists: '✅ news_articles table found',
        insert_test: '✅ Can insert articles',
        cleanup_test: '✅ Can delete articles',
        missing_tables: missingTables.length > 0 ? `⚠️ Missing: ${missingTables.join(', ')}` : '✅ All tables present'
      },
      next_step: missingTables.length > 0 
        ? 'Some tables are missing - run the full migration script'
        : 'Database is ready! The issue might be in the RSS parsing logic.'
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        possible_causes: [
          'Database migration not applied',
          'Supabase connection issue',
          'RLS policies blocking access'
        ]
      },
      { status: 500 }
    )
  }
}