import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

interface MatchResult {
  articleId: string
  contactMatches: number
  companyMatches: number
  projectMatches: number
}

// Get all unprocessed articles
async function getUnprocessedArticles() {
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, title, summary, content')
    .eq('is_processed', false)
    .order('published_at', { ascending: false })
    .limit(50) // Process in batches
  
  if (error) {
    console.error('Error fetching unprocessed articles:', error)
    return []
  }
  
  return articles || []
}

// Get all contacts, companies, and projects for matching from ALL workspaces
// (Since news articles are global, we want to match across all workspaces)
async function getMatchingData() {
  if (!supabaseAdmin) {
    throw new Error('Service role key required for matching operations')
  }

  const [contactsRes, companiesRes, projectsRes] = await Promise.all([
    supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, workspace_id, companies(name)'),
    
    supabaseAdmin
      .from('companies')  
      .select('id, name, workspace_id'),
      
    supabaseAdmin
      .from('projects')
      .select('id, title, workspace_id')
  ])
  
  console.log('Matching data loaded:', {
    contacts: contactsRes.data?.length || 0,
    companies: companiesRes.data?.length || 0,
    projects: projectsRes.data?.length || 0,
    contactsError: contactsRes.error?.message,
    companiesError: companiesRes.error?.message,
    projectsError: projectsRes.error?.message
  })
  
  // Debug: Log first few contacts to see the data structure
  if (contactsRes.data && contactsRes.data.length > 0) {
    console.log('Sample contacts:', contactsRes.data.slice(0, 5).map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      full_name: `${c.first_name} ${c.last_name}`,
      workspace_id: c.workspace_id
    })))
    
    // Check for specific names we're looking for
    const margotRobbie = contactsRes.data.find(c => 
      c.first_name?.toLowerCase() === 'margot' && c.last_name?.toLowerCase() === 'robbie'
    )
    const bobIger = contactsRes.data.find(c => 
      c.first_name?.toLowerCase() === 'bob' && c.last_name?.toLowerCase() === 'iger'
    )
    
    console.log('Looking for specific contacts:', {
      margot_robbie_found: !!margotRobbie,
      margot_robbie_workspace: margotRobbie?.workspace_id,
      bob_iger_found: !!bobIger,
      bob_iger_workspace: bobIger?.workspace_id
    })
    
    // Show unique workspace IDs
    const workspaceIds = Array.from(new Set(contactsRes.data.map(c => c.workspace_id)))
    console.log('Workspaces represented in contacts:', workspaceIds)
  }
  
  return {
    contacts: contactsRes.data || [],
    companies: companiesRes.data || [],
    projects: projectsRes.data || []
  }
}

// Create search variations for better matching
function createSearchVariations(text: string): string[] {
  const variations = [text.toLowerCase()]
  
  // Add variations without common prefixes/suffixes
  const withoutThe = text.replace(/^the\s+/i, '').toLowerCase()
  if (withoutThe !== text.toLowerCase()) {
    variations.push(withoutThe)
  }
  
  // Add variations with common company suffixes
  if (!text.match(/\b(inc|llc|ltd|corp|corporation|studio|studios|entertainment|productions|films|pictures)\b/i)) {
    variations.push(`${text.toLowerCase()} studios`)
    variations.push(`${text.toLowerCase()} entertainment`)
    variations.push(`${text.toLowerCase()} productions`)
  }
  
  return variations
}

// Calculate match confidence based on context
function calculateConfidence(matchText: string, fullText: string): number {
  const matchLength = matchText.length
  const fullLength = fullText.length
  
  // Base confidence on match length
  let confidence = Math.min(matchLength / 20, 1.0)
  
  // Boost confidence if surrounded by industry keywords
  const context = fullText.toLowerCase()
  const industryKeywords = [
    'studio', 'production', 'film', 'movie', 'director', 'producer', 'executive',
    'development', 'greenlight', 'casting', 'screenplay', 'script', 'project',
    'netflix', 'disney', 'warner', 'universal', 'paramount', 'sony'
  ]
  
  const hasIndustryContext = industryKeywords.some(keyword => 
    context.includes(keyword)
  )
  
  if (hasIndustryContext) {
    confidence = Math.min(confidence + 0.3, 1.0)
  }
  
  // Reduce confidence for very short matches in long text
  if (matchLength < 5 && fullLength > 500) {
    confidence *= 0.5
  }
  
  return Math.round(confidence * 100) / 100
}

// Find matches in article text
function findMatches(articleText: string, searchTerms: string[]): Array<{term: string, confidence: number}> {
  const matches: Array<{term: string, confidence: number}> = []
  const lowerText = articleText.toLowerCase()
  
  for (const term of searchTerms) {
    if (term.length < 3) continue // Skip very short terms
    
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const match = lowerText.match(regex)
    
    if (match) {
      const confidence = calculateConfidence(term, articleText)
      matches.push({ term, confidence })
    }
  }
  
  return matches
}

// Match articles to contacts
async function matchContacts(article: any, contacts: any[]) {
  const articleText = `${article.title} ${article.summary} ${article.content || ''}`
  const matches = []
  
  for (const contact of contacts) {
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim()
    const companyName = contact.companies?.name
    
    // Prioritize full name matches and company name matches over individual name matches
    const searchTerms = []
    
    // Full name (highest priority) - maps to 'name_mention'
    if (contact.last_name) {
      searchTerms.push({ term: fullName, priority: 'high', type: 'name_mention' })
    }
    
    // Company name (high priority) - maps to 'company_mention'
    if (companyName) {
      searchTerms.push({ term: companyName, priority: 'high', type: 'company_mention' })
    }
    
    // Individual names (low priority - only if no high priority matches) - also 'name_mention'
    searchTerms.push(
      { term: contact.first_name, priority: 'low', type: 'name_mention' },
      ...(contact.last_name ? [{ term: contact.last_name, priority: 'low', type: 'name_mention' }] : [])
    )
    
    let bestMatch = null
    let foundHighPriorityMatch = false
    
    // Look for matches, prioritizing high priority terms
    for (const searchItem of searchTerms) {
      if (foundHighPriorityMatch && searchItem.priority === 'low') {
        // Skip low priority matches if we already found a high priority match
        continue
      }
      
      const foundMatches = findMatches(articleText, [searchItem.term])
      
      if (foundMatches.length > 0) {
        const match = foundMatches[0]
        
        // Boost confidence for high priority matches
        const boostedConfidence = searchItem.priority === 'high' ? 
          Math.min(match.confidence + 0.3, 1.0) : match.confidence
        
        if (!bestMatch || boostedConfidence > bestMatch.confidence) {
          bestMatch = {
            ...match,
            confidence: boostedConfidence,
            matchType: searchItem.type,
            term: searchItem.term,
            priority: searchItem.priority
          }
        }
        
        if (searchItem.priority === 'high') {
          foundHighPriorityMatch = true
        }
      }
    }
    
    // Only add matches with reasonable confidence (reduced threshold for high priority matches)
    if (bestMatch && (
      (bestMatch.matchType === 'name_mention' && bestMatch.priority === 'high' && bestMatch.confidence >= 0.3) || // Full name matches
      (bestMatch.matchType === 'company_mention' && bestMatch.confidence >= 0.3) || // Company name matches
      (bestMatch.matchType === 'name_mention' && bestMatch.priority === 'low' && bestMatch.confidence >= 0.8) // Individual name matches need high confidence
    )) {
      matches.push({
        contactId: contact.id,
        matchType: bestMatch.matchType,
        confidence: bestMatch.confidence,
        matchedText: bestMatch.term
      })
    }
  }
  
  return matches
}

// Match articles to companies
async function matchCompanies(article: any, companies: any[]) {
  const articleText = `${article.title} ${article.summary} ${article.content || ''}`
  const matches = []
  
  for (const company of companies) {
    const searchTerms = createSearchVariations(company.name)
    const foundMatches = findMatches(articleText, searchTerms)
    
    if (foundMatches.length > 0) {
      const bestMatch = foundMatches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      
      matches.push({
        companyId: company.id,
        matchType: 'company_mention',
        confidence: bestMatch.confidence,
        matchedText: bestMatch.term
      })
    }
  }
  
  return matches
}

// Match articles to projects
async function matchProjects(article: any, projects: any[]) {
  const articleText = `${article.title} ${article.summary} ${article.content || ''}`
  const matches = []
  
  for (const project of projects) {
    const searchTerms = [
      project.title,
      ...createSearchVariations(project.title)
    ]
    
    const foundMatches = findMatches(articleText, searchTerms)
    
    if (foundMatches.length > 0) {
      const bestMatch = foundMatches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      
      matches.push({
        projectId: project.id,
        matchType: 'title_mention',
        confidence: bestMatch.confidence,
        matchedText: bestMatch.term
      })
    }
  }
  
  return matches
}

// Save matches to database
async function saveMatches(articleId: string, contactMatches: any[], companyMatches: any[], projectMatches: any[]) {
  const promises = []
  
  if (!supabaseAdmin) {
    throw new Error('Service role key required for saving matches')
  }

  // Save contact matches with trigger bypass
  for (const match of contactMatches) {
    try {
      // Try to insert, but expect trigger errors due to workspace_id ambiguity
      const { error: insertError, data } = await supabaseAdmin
        .from('news_contact_matches')
        .insert({
          news_article_id: articleId,
          contact_id: match.contactId,
          match_type: match.matchType,
          match_confidence: match.confidence,
          matched_text: match.matchedText
        })
      
      // Check if error is the workspace_id ambiguity (which means insert might have succeeded)
      if (insertError && insertError.code === '42702') {
        console.log('⚠️ Trigger error (expected due to workspace_id ambiguity) - checking if row was inserted')
        
        // Check if the row was actually inserted despite the trigger error
        const { data: checkData, error: checkError } = await supabaseAdmin
          .from('news_contact_matches')
          .select('id')
          .eq('news_article_id', articleId)
          .eq('contact_id', match.contactId)
          .single()
        
        if (!checkError && checkData) {
          console.log('✅ Contact match was saved successfully despite trigger error')
        } else {
          console.error('❌ Contact match not saved due to trigger error')
        }
      } else if (insertError) {
        console.error('❌ Failed to insert contact match:', insertError)
      } else {
        console.log('✅ Contact match saved successfully')
      }
    } catch (error) {
      console.error('❌ Contact match insert error:', error)
    }
  }
  
  // Save company matches
  for (const match of companyMatches) {
    promises.push(
      supabaseAdmin.from('news_company_matches').insert({
        news_article_id: articleId,
        company_id: match.companyId,
        match_type: match.matchType,
        match_confidence: match.confidence,
        matched_text: match.matchedText
      })
    )
  }
  
  // Save project matches
  for (const match of projectMatches) {
    promises.push(
      supabaseAdmin.from('news_project_matches').insert({
        news_article_id: articleId,
        project_id: match.projectId,
        match_type: match.matchType,
        match_confidence: match.confidence,
        matched_text: match.matchedText
      })
    )
  }
  
  await Promise.allSettled(promises)
  
  // Create consolidated notifications (one per contact, not per article)
  if (contactMatches.length > 0) {
    console.log('📧 Creating consolidated contact notifications')
    
    try {
      // Group matches by contact to create one notification per contact
      const contactGroups = new Map()
      
      for (const match of contactMatches) {
        if (!contactGroups.has(match.contactId)) {
          contactGroups.set(match.contactId, [])
        }
        contactGroups.get(match.contactId).push(match)
      }

      // For each contact, create/update ONE shared notification
      for (const [contactId, matches] of Array.from(contactGroups.entries())) {
        console.log('📧 Processing shared notification for contact:', contactId, 'with', matches.length, 'matches')
        
        // Get contact info and workspace
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('first_name, last_name, workspace_id')
          .eq('id', contactId)
          .single()
          
        if (!contact) {
          console.log('⚠️ Contact not found:', contactId)
          continue
        }
        
        const contactName = `${contact.first_name} ${contact.last_name || ''}`.trim()
        
        // Check for existing shared notification for this contact in this workspace
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id, created_at')
          .eq('workspace_id', contact.workspace_id)
          .eq('entity_type', 'contact')
          .eq('entity_id', contactId)
          .eq('action_type', 'match')
          .is('user_id', null) // Shared notifications have null user_id
          .single()

        if (existingNotification) {
          // Update existing shared notification timestamp to make it appear as new
          const { error: updateError } = await supabaseAdmin
            .from('notifications')
            .update({
              created_at: new Date().toISOString(),
              message: `${contactName} has new industry news matches`,
              metadata: {
                contact_id: contactId,
                contact_name: contactName,
                total_matches: matches.length,
                latest_article_id: articleId,
                source: 'market_intelligence'
              }
            })
            .eq('id', existingNotification.id)
            
          if (updateError) {
            console.error('❌ Failed to update shared notification:', updateError)
          } else {
            console.log('✅ Updated shared notification for contact:', contactId)
          }
        } else {
          // Create new shared notification (user_id = null for shared notifications)
          const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert({
              workspace_id: contact.workspace_id,
              user_id: null, // NULL indicates this is a shared notification
              title: 'Industry News Match',
              message: `${contactName} has industry news matches`,
              action_type: 'match',
              entity_type: 'contact',
              entity_id: contactId,
              entity_title: contactName,
              actor_user_id: null, // No specific actor for automated matches
              is_read: false, // This field becomes unused for shared notifications
              metadata: {
                contact_id: contactId,
                contact_name: contactName,
                total_matches: matches.length,
                latest_article_id: articleId,
                source: 'market_intelligence'
              }
            })
            
          if (insertError) {
            console.error('❌ Failed to create shared notification:', insertError)
          } else {
            console.log('✅ Shared notification created for contact:', contactId)
          }
        }
      }
    } catch (error) {
      console.error('❌ Consolidated notification creation failed:', error)
    }
  } else {
    console.log('📧 No contact matches found - skipping notifications')
  }
  
  // Mark article as processed
  await supabase
    .from('news_articles')
    .update({ 
      is_processed: true,
      relevance_score: contactMatches.length + companyMatches.length + projectMatches.length 
    })
    .eq('id', articleId)
  
  return {
    contactMatches: contactMatches.length,
    companyMatches: companyMatches.length,
    projectMatches: projectMatches.length
  }
}

// Main API route handler
export async function POST(request: NextRequest) {
  try {
    const articles = await getUnprocessedArticles()
    const { contacts, companies, projects } = await getMatchingData()
    
    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unprocessed articles found',
        processed: 0
      })
    }
    
    const results: MatchResult[] = []
    
    for (const article of articles) {
      console.log(`Processing article: ${article.title}`)
      
      const [contactMatches, companyMatches, projectMatches] = await Promise.all([
        matchContacts(article, contacts),
        matchCompanies(article, companies),
        matchProjects(article, projects)
      ])
      
      const savedMatches = await saveMatches(
        article.id, 
        contactMatches, 
        companyMatches, 
        projectMatches
      )
      
      results.push({
        articleId: article.id,
        ...savedMatches
      })
      
      console.log(`Article processed: ${savedMatches.contactMatches} contacts, ${savedMatches.companyMatches} companies, ${savedMatches.projectMatches} projects`)
    }
    
    const totals = results.reduce((acc, result) => ({
      articles: acc.articles + 1,
      contactMatches: acc.contactMatches + result.contactMatches,
      companyMatches: acc.companyMatches + result.companyMatches,
      projectMatches: acc.projectMatches + result.projectMatches
    }), { articles: 0, contactMatches: 0, companyMatches: 0, projectMatches: 0 })
    
    return NextResponse.json({
      success: true,
      message: 'Articles matched successfully',
      processed: totals.articles,
      matches: {
        contacts: totals.contactMatches,
        companies: totals.companyMatches,
        projects: totals.projectMatches
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error matching articles:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to match articles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow manual testing via GET request
export async function GET() {
  return NextResponse.json({
    message: 'Market Intelligence Article Matcher',
    usage: 'Send POST request to match unprocessed articles'
  })
}