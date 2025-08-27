import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test different ways to check if tables exist
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Test 1: Try to query news_articles table
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, created_at')
        .limit(1)
      
      if (error) {
        results.tests.news_articles = {
          status: 'error',
          error: error.message,
          code: error.code
        }
      } else {
        results.tests.news_articles = {
          status: 'success',
          rows_found: data?.length || 0
        }
      }
    } catch (err: any) {
      results.tests.news_articles = {
        status: 'exception',
        error: err.message
      }
    }

    // Test 2: Check existing tables (contacts, projects, etc.)
    const existingTables = ['contacts', 'projects', 'companies', 'workspace_members']
    
    for (const table of existingTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (error) {
          results.tests[table] = {
            status: 'error',
            error: error.message
          }
        } else {
          results.tests[table] = {
            status: 'success',
            rows_found: data?.length || 0
          }
        }
      } catch (err: any) {
        results.tests[table] = {
          status: 'exception',
          error: err.message
        }
      }
    }

    // Test 3: Try a raw SQL query to list tables
    try {
      const { data, error } = await supabase.rpc('get_schema_tables')
      results.tests.schema_query = {
        status: error ? 'error' : 'success',
        error: error?.message,
        result: data
      }
    } catch (err: any) {
      // This might not work if the function doesn't exist
      results.tests.schema_query = {
        status: 'not_available',
        note: 'Schema query function not available'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Table check complete',
      diagnosis: {
        news_tables_working: results.tests.news_articles?.status === 'success',
        existing_tables_working: results.tests.contacts?.status === 'success' && results.tests.projects?.status === 'success',
        possible_issues: [
          results.tests.news_articles?.status !== 'success' ? 'Market intelligence migration not applied' : null,
          results.tests.contacts?.status !== 'success' ? 'Basic database connection issue' : null
        ].filter(Boolean)
      },
      detailed_results: results,
      next_steps: results.tests.news_articles?.status !== 'success' 
        ? [
            'Copy the content from market-intelligence-migration.sql',
            'Go to Supabase Dashboard → SQL Editor',
            'Paste and run the migration',
            'Test again'
          ]
        : ['Database looks good - issue might be elsewhere']
    })

  } catch (error) {
    console.error('Table check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Table check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}