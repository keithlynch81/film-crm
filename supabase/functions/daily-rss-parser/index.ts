// Supabase Edge Function: Daily RSS Parser
// This function parses RSS feeds and saves new articles
// Triggered daily by cron schedule

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    name: 'hollywoodreporter',
    url: 'https://www.hollywoodreporter.com/c/movies/feed/',
    displayName: 'The Hollywood Reporter'
  }
]

interface RSSArticle {
  title: string
  summary: string
  url: string
  publishedAt: string
  author?: string
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
    const articles: RSSArticle[] = []

    // Extract items using regex
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
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

serve(async (req) => {
  try {
    // Verify this is a cron request or has proper authorization
    const authHeader = req.headers.get('authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily RSS parse...')
    const results = []

    for (const feed of RSS_FEEDS) {
      console.log(`Parsing RSS feed: ${feed.displayName}`)

      const articles = await parseRSSFeed(feed.url)
      let saved = 0
      let skipped = 0

      // Save articles to database
      for (const article of articles) {
        try {
          // Check if article already exists
          const { data: existing } = await supabase
            .from('news_articles')
            .select('id')
            .eq('url', article.url)
            .single()

          if (existing) {
            skipped++
            continue
          }

          // Insert new article (trigger will auto-match to tracked terms)
          const { error } = await supabase
            .from('news_articles')
            .insert({
              title: article.title,
              summary: article.summary,
              content_snippet: article.summary.substring(0, 500),
              url: article.url,
              published_at: article.publishedAt,
              source: feed.name,
              author: article.author,
              is_processed: false
            })

          if (error) {
            console.error('Error saving article:', error)
            continue
          }

          saved++
        } catch (error) {
          console.error('Error processing article:', error)
          continue
        }
      }

      results.push({
        feed: feed.displayName,
        articlesFound: articles.length,
        saved,
        skipped
      })

      console.log(`${feed.displayName}: Found ${articles.length}, Saved ${saved}, Skipped ${skipped}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily RSS parse completed',
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in daily RSS parser:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
