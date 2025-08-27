import { NextRequest, NextResponse } from 'next/server'

// Combined endpoint that parses RSS feeds and matches articles
// This is the main endpoint you'll call manually or set up as a cron job

export async function POST(request: NextRequest) {
  try {
    console.log('Starting market intelligence update...')
    
    // Step 1: Parse RSS feeds
    console.log('Step 1: Parsing RSS feeds...')
    const parseResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/market-intelligence/parse-rss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!parseResponse.ok) {
      throw new Error(`RSS parsing failed: ${parseResponse.status}`)
    }
    
    const parseResult = await parseResponse.json()
    console.log('RSS parsing result:', parseResult)
    
    // Step 2: Match articles to contacts/companies/projects
    console.log('Step 2: Matching articles...')
    const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/market-intelligence/match-articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!matchResponse.ok) {
      throw new Error(`Article matching failed: ${matchResponse.status}`)
    }
    
    const matchResult = await matchResponse.json()
    console.log('Article matching result:', matchResult)
    
    return NextResponse.json({
      success: true,
      message: 'Market intelligence updated successfully',
      results: {
        rss_parsing: parseResult,
        article_matching: matchResult
      },
      summary: {
        articles_found: parseResult.results?.reduce((total: number, feed: any) => total + feed.articlesFound, 0) || 0,
        articles_saved: parseResult.results?.reduce((total: number, feed: any) => total + feed.saved, 0) || 0,
        articles_processed: matchResult.processed || 0,
        contact_matches: matchResult.matches?.contacts || 0,
        company_matches: matchResult.matches?.companies || 0,
        project_matches: matchResult.matches?.projects || 0
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating market intelligence:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update market intelligence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status/info
export async function GET() {
  return NextResponse.json({
    message: 'Market Intelligence Update Endpoint',
    usage: 'Send POST request to update RSS feeds and match articles',
    description: 'This endpoint combines RSS parsing and article matching into one operation',
    endpoints: {
      '/api/market-intelligence/parse-rss': 'Parse RSS feeds from industry publications',
      '/api/market-intelligence/match-articles': 'Match unprocessed articles to contacts/companies',
      '/api/market-intelligence/update': 'Combined operation (this endpoint)'
    }
  })
}