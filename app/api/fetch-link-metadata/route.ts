import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkMetadataBot/1.0)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Extract title from HTML
    // Try multiple methods to find the title
    let title = null

    // Method 1: Look for <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim()
    }

    // Method 2: Look for Open Graph title if no title found
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim()
      }
    }

    // Method 3: Look for Twitter title if still no title
    if (!title) {
      const twitterTitleMatch = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i)
      if (twitterTitleMatch && twitterTitleMatch[1]) {
        title = twitterTitleMatch[1].trim()
      }
    }

    // Decode HTML entities (like &amp; -> &, &quot; -> ", etc.)
    if (title) {
      title = title
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
    }

    // Extract favicon URL (optional)
    let faviconUrl = null
    const faviconMatch = html.match(/<link[^>]*rel="(?:icon|shortcut icon)"[^>]*href="([^"]+)"/i)
    if (faviconMatch && faviconMatch[1]) {
      const favicon = faviconMatch[1]
      // Make absolute URL if relative
      if (favicon.startsWith('http')) {
        faviconUrl = favicon
      } else if (favicon.startsWith('//')) {
        faviconUrl = 'https:' + favicon
      } else {
        const urlObj = new URL(url)
        faviconUrl = urlObj.origin + (favicon.startsWith('/') ? favicon : '/' + favicon)
      }
    } else {
      // Fallback to /favicon.ico
      const urlObj = new URL(url)
      faviconUrl = urlObj.origin + '/favicon.ico'
    }

    return NextResponse.json({
      title: title || null,
      favicon_url: faviconUrl,
      url: url,
    })
  } catch (error: any) {
    console.error('Error fetching link metadata:', error)

    // Handle timeout errors specifically
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - URL took too long to respond' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}
