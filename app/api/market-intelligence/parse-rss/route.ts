import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// RSS feed URLs for industry publications
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
    url: 'https://www.screendaily.com/45202.rss',
    displayName: 'Screen Daily'
  },
  {
    name: 'cineuropa',
    url: 'https://cineuropa.org/en/rss/',
    displayName: 'Cineuropa'
  },
  {
    name: 'filmneweurope',
    url: 'https://www.filmneweurope.com/?format=feed&type=rss',
    displayName: 'Film New Europe'
  },
  {
    name: 'lwlies',
    url: 'https://lwlies.com/feed/',
    displayName: 'Little White Lies'
  },
  {
    name: 'screenrant',
    url: 'https://screenrant.com/feed/',
    displayName: 'Screen Rant'
  },
  {
    name: 'collider',
    url: 'https://collider.com/feed/',
    displayName: 'Collider'
  },
  {
    name: 'hollywoodreporter',
    url: 'https://www.hollywoodreporter.com/c/movies/feed/',
    displayName: 'The Hollywood Reporter'
  },
  {
    name: 'slashfilm',
    url: 'https://feeds.feedburner.com/slashfilm',
    displayName: 'SlashFilm'
  },
  {
    name: 'firstshowing',
    url: 'https://www.firstshowing.net/feed/?full',
    displayName: 'FirstShowing'
  }
] as const

type RSSFeed = typeof RSS_FEEDS[number]

interface RSSArticle {
  title: string
  summary: string
  content?: string
  url: string
  publishedAt: string
  author?: string
  imageUrl?: string
}

// Parse RSS XML to extract articles
async function parseRSSFeed(feedUrl: string): Promise<RSSArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Film CRM Market Intelligence Bot 1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const xmlText = await response.text()
    
    // Simple XML parsing for RSS (in production, consider using a proper XML parser)
    const articles: RSSArticle[] = []
    
    // Extract items using regex (basic implementation)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
    
    for (const itemXml of itemMatches) {
      try {
        const title = extractXMLContent(itemXml, 'title')
        const description = extractXMLContent(itemXml, 'description') || extractXMLContent(itemXml, 'summary')
        const link = extractXMLContent(itemXml, 'link') || extractXMLContent(itemXml, 'guid')
        const pubDate = extractXMLContent(itemXml, 'pubDate') || extractXMLContent(itemXml, 'published')
        const author = extractXMLContent(itemXml, 'author') || extractXMLContent(itemXml, 'dc:creator')
        
        if (title && link && pubDate) {
          articles.push({
            title: cleanText(title),
            summary: cleanText(description || ''),
            url: link,
            publishedAt: new Date(pubDate).toISOString(),
            author: author ? cleanText(author) : undefined
          })
        }
      } catch (error) {
        console.error('Error parsing individual article:', error)
        continue
      }
    }
    
    return articles
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error)
    return []
  }
}

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

// Save articles to database
async function saveArticles(articles: RSSArticle[], source: string) {
  if (articles.length === 0) return { saved: 0, skipped: 0 }
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured')
    return { saved: 0, skipped: 0 }
  }

  let saved = 0
  let skipped = 0

  for (const article of articles) {
    try {
      // Check if article already exists
      const { data: existing } = await supabaseAdmin
        .from('news_articles')
        .select('id')
        .eq('url', article.url)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insert new article
      const { data, error } = await supabaseAdmin
        .from('news_articles')
        .insert({
          title: article.title,
          summary: article.summary, // Database column is 'summary'
          url: article.url,
          published_at: article.publishedAt,
          source: source,
          is_processed: false
        })
        .select()

      if (error) {
        console.error('Error saving article:', {
          error,
          article: { title: article.title, url: article.url, source }
        })
        continue
      }

      saved++
      console.log(`Saved article: ${article.title}`)
    } catch (error) {
      console.error('Error processing article:', error)
      continue
    }
  }

  return { saved, skipped }
}

// Main API route handler
export async function POST(request: NextRequest) {
  try {
    const results = []
    
    for (const feed of RSS_FEEDS) {
      console.log(`Parsing RSS feed: ${feed.displayName}`)
      
      const articles = await parseRSSFeed(feed.url)
      const { saved, skipped } = await saveArticles(articles, feed.name)
      
      results.push({
        feed: feed.displayName,
        articlesFound: articles.length,
        saved,
        skipped
      })
      
      console.log(`${feed.displayName}: Found ${articles.length}, Saved ${saved}, Skipped ${skipped}`)
    }
    
    // Clean up old articles (older than 30 days)
    if (supabaseAdmin) {
      const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_old_news_articles')
      if (cleanupError) {
        console.error('Error cleaning up old articles:', cleanupError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'RSS feeds parsed successfully',
      results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error parsing RSS feeds:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to parse RSS feeds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow manual testing via GET request
export async function GET() {
  return NextResponse.json({
    message: 'Market Intelligence RSS Parser',
    usage: 'Send POST request to parse RSS feeds',
    feeds: RSS_FEEDS.map(f => ({ name: f.displayName, url: f.url }))
  })
}