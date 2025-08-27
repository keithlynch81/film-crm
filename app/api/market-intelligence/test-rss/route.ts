import { NextRequest, NextResponse } from 'next/server'

// Test RSS feed URLs individually
const RSS_FEEDS = [
  {
    name: 'variety',
    url: 'https://variety.com/feed/',
    displayName: 'Variety'
  },
  {
    name: 'deadline',
    url: 'https://deadline.com/feed/',
    displayName: 'Deadline'
  },
  {
    name: 'screendaily',
    url: 'https://www.screendaily.com/full-rss',
    displayName: 'Screen Daily'
  }
] as const

// Extract content between XML tags
function extractXMLContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

// Clean HTML entities and tags from text
function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // Remove CDATA
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

// Test a single RSS feed
async function testRSSFeed(feedUrl: string, feedName: string) {
  try {
    console.log(`Testing ${feedName}: ${feedUrl}`)
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Film CRM Market Intelligence Bot 1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: feedUrl
      }
    }
    
    const xmlText = await response.text()
    
    // Check if it's actually XML/RSS
    if (!xmlText.includes('<rss') && !xmlText.includes('<feed')) {
      return {
        success: false,
        error: 'Response is not RSS/XML format',
        url: feedUrl,
        content_preview: xmlText.substring(0, 200) + '...'
      }
    }
    
    // Extract items using regex (basic implementation)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
    
    const articles = []
    for (let i = 0; i < Math.min(3, itemMatches.length); i++) {
      const itemXml = itemMatches[i]
      try {
        const title = extractXMLContent(itemXml, 'title')
        const description = extractXMLContent(itemXml, 'description') || extractXMLContent(itemXml, 'summary')
        const link = extractXMLContent(itemXml, 'link') || extractXMLContent(itemXml, 'guid')
        const pubDate = extractXMLContent(itemXml, 'pubDate') || extractXMLContent(itemXml, 'published')
        
        if (title && link) {
          articles.push({
            title: cleanText(title),
            description: cleanText(description || ''),
            link,
            pubDate,
            raw_item: itemXml.substring(0, 300) + '...'
          })
        }
      } catch (error) {
        console.error(`Error parsing item ${i}:`, error)
      }
    }
    
    return {
      success: true,
      url: feedUrl,
      total_items_found: itemMatches.length,
      sample_articles: articles,
      raw_xml_preview: xmlText.substring(0, 500) + '...'
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: feedUrl
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Testing RSS feeds...')
    
    const results = []
    
    for (const feed of RSS_FEEDS) {
      const result = await testRSSFeed(feed.url, feed.displayName)
      results.push({
        feed: feed.displayName,
        name: feed.name,
        ...result
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'RSS feed test complete',
      timestamp: new Date().toISOString(),
      results
    })
    
  } catch (error) {
    console.error('Error testing RSS feeds:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test RSS feeds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}