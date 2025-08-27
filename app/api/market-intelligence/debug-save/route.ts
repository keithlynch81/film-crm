import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Debug the RSS saving process step by step
export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG RSS SAVING PROCESS ===')
    
    // Step 1: Try to manually save a test article
    const testArticle = {
      title: 'TEST: Tina Fey Debug Article',
      summary: 'This is a debug test article to see if saving works',
      url: `https://test-debug.com/article-${Date.now()}`,
      published_at: new Date().toISOString(),
      source: 'variety', // Use valid source from constraint
      author: 'Debug Test',
      is_processed: false
    }
    
    console.log('Step 1: Attempting to save test article...')
    const { data: savedArticle, error: saveError } = await supabase
      .from('news_articles')
      .insert([testArticle])
      .select()
    
    if (saveError) {
      console.error('SAVE ERROR:', saveError)
      return NextResponse.json({
        success: false,
        step: 'manual_save',
        error: saveError.message,
        test_article: testArticle
      })
    }
    
    console.log('Step 1: SUCCESS - Test article saved:', savedArticle)
    
    // Step 2: Fetch a real RSS feed and try to parse/save one article
    console.log('Step 2: Fetching real RSS from Deadline...')
    const rssResponse = await fetch('https://deadline.com/feed/', {
      headers: {
        'User-Agent': 'Film CRM Market Intelligence Bot 1.0'
      }
    })
    
    if (!rssResponse.ok) {
      return NextResponse.json({
        success: false,
        step: 'rss_fetch',
        error: `HTTP ${rssResponse.status}: ${rssResponse.statusText}`
      })
    }
    
    const xmlText = await rssResponse.text()
    console.log('Step 2: RSS XML length:', xmlText.length)
    
    // Step 3: Parse the first article manually
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
    console.log('Step 3: Found', itemMatches.length, 'articles in RSS')
    
    if (itemMatches.length === 0) {
      return NextResponse.json({
        success: false,
        step: 'rss_parse',
        error: 'No articles found in RSS feed',
        xml_preview: xmlText.substring(0, 500) + '...'
      })
    }
    
    // Parse first article
    const firstItem = itemMatches[0]
    
    function extractXMLContent(xml: string, tagName: string): string | null {
      const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }
    
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
    
    const title = extractXMLContent(firstItem, 'title')
    const description = extractXMLContent(firstItem, 'description')
    const link = extractXMLContent(firstItem, 'link') || extractXMLContent(firstItem, 'guid')
    const pubDate = extractXMLContent(firstItem, 'pubDate')
    
    console.log('Step 3: Parsed first article:')
    console.log('- Title:', title)
    console.log('- Link:', link)
    console.log('- PubDate:', pubDate)
    
    if (!title || !link || !pubDate) {
      return NextResponse.json({
        success: false,
        step: 'article_parse',
        error: 'Could not parse required fields from RSS item',
        parsed_data: { title, link, pubDate },
        raw_item: firstItem.substring(0, 500) + '...'
      })
    }
    
    // Step 4: Check if this article already exists
    const { data: existingArticle } = await supabase
      .from('news_articles')
      .select('id')
      .eq('url', link)
      .single()
    
    console.log('Step 4: Existing article check:', existingArticle ? 'FOUND' : 'NOT FOUND')
    
    if (existingArticle) {
      return NextResponse.json({
        success: true,
        step: 'duplicate_skip',
        message: 'Article already exists - this is why it was skipped',
        existing_article_id: existingArticle.id,
        article_url: link,
        cleanup_test_article: savedArticle?.[0]?.id
      })
    }
    
    // Step 5: Try to save the real article
    const realArticle = {
      title: cleanText(title),
      summary: cleanText(description || ''),
      url: link,
      published_at: new Date(pubDate).toISOString(),
      source: 'deadline',
      author: null,
      is_processed: false
    }
    
    console.log('Step 5: Attempting to save real article...')
    const { data: savedRealArticle, error: realSaveError } = await supabase
      .from('news_articles')
      .insert([realArticle])
      .select()
    
    if (realSaveError) {
      console.error('REAL ARTICLE SAVE ERROR:', realSaveError)
      return NextResponse.json({
        success: false,
        step: 'real_article_save',
        error: realSaveError.message,
        article_data: realArticle
      })
    }
    
    console.log('Step 5: SUCCESS - Real article saved:', savedRealArticle)
    
    // Cleanup - delete both test articles
    if (savedArticle?.[0]?.id) {
      await supabase.from('news_articles').delete().eq('id', savedArticle[0].id)
    }
    if (savedRealArticle?.[0]?.id) {
      await supabase.from('news_articles').delete().eq('id', savedRealArticle[0].id)
    }
    
    return NextResponse.json({
      success: true,
      message: 'RSS saving process works perfectly!',
      steps_completed: [
        '✅ Manual article save works',
        '✅ RSS fetch works', 
        '✅ RSS parsing works',
        '✅ Real article save works'
      ],
      conclusion: 'The RSS saving logic is working. Articles might be getting skipped as duplicates.',
      recommendation: 'Try running the full RSS update - it should work now.',
      test_article_title: cleanText(title),
      parsed_date: new Date(pubDate).toISOString()
    })
    
  } catch (error) {
    console.error('Debug save error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug save failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}