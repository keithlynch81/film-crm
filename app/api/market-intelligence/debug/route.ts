import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Debug endpoint to help troubleshoot matching issues
export async function GET(request: NextRequest) {
  try {
    // Get recent articles (last 5)
    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('id, title, summary, source, published_at, is_processed')
      .order('published_at', { ascending: false })
      .limit(5)

    if (articlesError) {
      throw new Error(`Error fetching articles: ${articlesError.message}`)
    }

    // Get all contacts with their names - using admin client
    console.log('Fetching contacts with admin client...')
    if (!supabaseAdmin) {
      throw new Error('Service role key required for debug operations')
    }
    
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, companies:company_id(name)')
      .limit(10)
    
    console.log('Contacts query result:', {
      contactsCount: contacts?.length || 0,
      contactsError: contactsError?.message,
      contactsCode: contactsError?.code
    })

    if (contactsError) {
      throw new Error(`Error fetching contacts: ${contactsError.message}`)
    }

    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .limit(10)

    if (companiesError) {
      throw new Error(`Error fetching companies: ${companiesError.message}`)
    }

    // Get existing matches
    const { data: contactMatches, error: matchesError } = await supabaseAdmin
      .from('news_contact_matches')
      .select(`
        id,
        match_type,
        match_confidence,
        matched_text,
        contacts:contact_id(first_name, last_name),
        news_articles:news_article_id(title, published_at)
      `)
      .limit(10)

    if (matchesError) {
      throw new Error(`Error fetching matches: ${matchesError.message}`)
    }

    // Test matching logic on most recent article
    let testMatching = null
    if (articles && articles.length > 0 && contacts && contacts.length > 0) {
      const testArticle = articles[0]
      const testText = `${testArticle.title} ${testArticle.summary}`.toLowerCase()
      
      const testResults = contacts.map((contact: any) => {
        const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase()
        const firstName = contact.first_name.toLowerCase()
        const lastName = contact.last_name?.toLowerCase() || ''
        const companyName = contact.companies?.name || 'No company'
        
        return {
          contact: `${contact.first_name} ${contact.last_name || ''}`,
          company: companyName,
          tests: {
            fullNameMatch: testText.includes(fullName),
            firstNameMatch: testText.includes(firstName),
            lastNameMatch: lastName ? testText.includes(lastName) : false,
            companyMatch: contact.companies?.name ? testText.includes(contact.companies.name.toLowerCase()) : false
          },
          searchTerms: {
            fullName,
            firstName,
            lastName: lastName || null,
            company: contact.companies?.name?.toLowerCase() || null
          }
        }
      })
      
      testMatching = {
        articleTitle: testArticle.title,
        articleText: testText.substring(0, 200) + '...',
        results: testResults
      }
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        articles_count: articles?.length || 0,
        contacts_count: contacts?.length || 0,
        companies_count: companies?.length || 0,
        existing_matches_count: contactMatches?.length || 0
      },
      recent_articles: articles?.map(a => ({
        id: a.id,
        title: a.title,
        source: a.source,
        published_at: a.published_at,
        is_processed: a.is_processed,
        text_preview: `${a.title} ${a.summary || ''}`.substring(0, 100) + '...'
      })),
      your_contacts: contacts?.map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ''}`,
        company: c.companies?.name || 'No company'
      })),
      your_companies: companies?.map(c => ({
        id: c.id,
        name: c.name
      })),
      existing_matches: contactMatches?.map((m: any) => ({
        matched_text: m.matched_text,
        confidence: m.match_confidence,
        contact: `${m.contacts.first_name} ${m.contacts.last_name || ''}`,
        article: m.news_articles.title
      })),
      test_matching: testMatching,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for debug actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, name } = body

    if (action === 'find_contact') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for contact search')
      }
      
      // Search for a specific contact across all workspaces
      const { data: contacts, error } = await supabaseAdmin
        .from('contacts')
        .select('id, first_name, last_name, workspace_id, companies:company_id(name)')
        .ilike('first_name', `%${name.split(' ')[0]}%`)
        .limit(20)

      if (error) {
        throw new Error(`Error searching contacts: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        search_term: name,
        contacts_found: contacts?.length || 0,
        results: contacts?.map((c: any) => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name || ''}`,
          workspace_id: c.workspace_id,
          company: c.companies?.name || 'No company'
        }))
      })
    }

    if (action === 'check_notifications') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for notification check')
      }
      
      // Check notifications for Market Intelligence
      const { data: notifications, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('action_type', 'match')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch notifications',
          details: error
        })
      }

      return NextResponse.json({
        success: true,
        notifications_found: notifications?.length || 0,
        results: notifications?.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          entity_type: n.entity_type,
          entity_id: n.entity_id,
          entity_title: n.entity_title,
          workspace_id: n.workspace_id,
          user_id: n.user_id,
          is_read: n.is_read,
          created_at: n.created_at,
          metadata: n.metadata
        })) || []
      })
    }

    if (action === 'check_article_matches') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for article matches check')
      }
      
      // Check matches for specific articles
      const { article_ids } = body
      const results = []
      
      for (const articleId of article_ids) {
        const { data: matches, error } = await supabaseAdmin
          .from('news_contact_matches')
          .select(`
            id,
            match_type,
            match_confidence,
            matched_text,
            contacts:contact_id(id, first_name, last_name)
          `)
          .eq('news_article_id', articleId)

        results.push({
          article_id: articleId,
          matches_found: matches?.length || 0,
          matches: matches?.map((m: any) => ({
            contact_id: m.contacts.id,
            contact_name: `${m.contacts.first_name} ${m.contacts.last_name}`,
            matched_text: m.matched_text,
            confidence: m.match_confidence,
            match_type: m.match_type
          })) || [],
          error: error?.message
        })
      }

      return NextResponse.json({
        success: true,
        results
      })
    }

    if (action === 'find_articles') {
      // Search for articles containing specific text
      const { search_text } = body
      const { data: articles, error } = await supabase
        .from('news_articles')
        .select('id, title, summary, published_at, source, is_processed')
        .ilike('title', `%${search_text}%`)
        .limit(10)

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Article search failed',
          details: error
        })
      }

      return NextResponse.json({
        success: true,
        search_text,
        articles_found: articles?.length || 0,
        results: articles?.map(a => ({
          id: a.id,
          title: a.title,
          summary: a.summary?.substring(0, 100) + '...',
          source: a.source,
          published_at: a.published_at,
          is_processed: a.is_processed
        }))
      })
    }

    if (action === 'find_matches') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for find matches')
      }
      
      // Find matches for a specific contact
      const { contact_id } = body
      const { data: matches, error } = await supabaseAdmin
        .from('news_contact_matches')
        .select(`
          id,
          match_type,
          match_confidence,
          matched_text,
          created_at,
          news_articles:news_article_id(title, published_at)
        `)
        .eq('contact_id', contact_id)
        .limit(20)

      if (error) {
        throw new Error(`Error finding matches: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        contact_id,
        matches_found: matches?.length || 0,
        results: matches?.map((m: any) => ({
          matched_text: m.matched_text,
          confidence: m.match_confidence,
          match_type: m.match_type,
          created_at: m.created_at,
          article: m.news_articles?.title || 'Unknown article'
        }))
      })
    }

    if (action === 'disable_trigger') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for trigger operations')
      }
      
      // Try to disable the trigger by updating system tables
      try {
        // Check if trigger exists
        const { data: triggerData, error: triggerError } = await supabaseAdmin
          .from('information_schema.triggers')
          .select('*')
          .eq('trigger_name', 'trigger_notify_new_matches')
          .eq('event_object_table', 'news_contact_matches')

        console.log('Trigger exists:', { triggerData, triggerError })

        if (triggerData && triggerData.length > 0) {
          // Try using a different approach - create a function to disable the trigger
          const result = { 
            success: true, 
            message: 'Trigger found but cannot be disabled without direct database access',
            details: 'Need to run: ALTER TABLE news_contact_matches DISABLE TRIGGER trigger_notify_new_matches;'
          }
          
          return NextResponse.json(result)
        }

        return NextResponse.json({
          success: false,
          message: 'Trigger not found'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Exception during trigger disable',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'fix_trigger') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for trigger fix')
      }
      
      // Since we can't drop the trigger directly, let's work around it
      // by fixing the function that's causing the workspace_id ambiguity
      try {
        // Create a corrected version of the notify function that doesn't have ambiguous references
        const { error: fixError } = await supabaseAdmin.rpc('exec', {
          sql: `
            -- Create a corrected version of the function without workspace_id ambiguity
            CREATE OR REPLACE FUNCTION notify_new_matches()
            RETURNS TRIGGER AS $$
            DECLARE
              contact_name TEXT;
              article_title TEXT;  
              contact_workspace_id UUID;
              workspace_users UUID[];
              user_id UUID;
            BEGIN
              -- Get contact info with explicit table reference
              SELECT 
                c.first_name || ' ' || COALESCE(c.last_name, ''),
                c.workspace_id
              INTO contact_name, contact_workspace_id
              FROM contacts c
              WHERE c.id = NEW.contact_id;

              -- Get article title
              SELECT title INTO article_title
              FROM news_articles 
              WHERE id = NEW.news_article_id;

              -- Get all users in this workspace with explicit table reference  
              SELECT ARRAY_AGG(wm.user_id) INTO workspace_users
              FROM workspace_members wm
              WHERE wm.workspace_id = contact_workspace_id;

              -- Create notifications for all users in workspace
              FOREACH user_id IN ARRAY workspace_users
              LOOP
                INSERT INTO notifications (
                  workspace_id,
                  user_id, 
                  title,
                  message,
                  action_type,
                  entity_type,
                  entity_id,
                  entity_title,
                  actor_user_id,
                  is_read,
                  metadata
                ) VALUES (
                  contact_workspace_id,
                  user_id,
                  'Industry News Match',
                  contact_name || ' mentioned in: ' || SUBSTRING(article_title, 1, 60) || '...',
                  'match',
                  'contact',
                  NEW.contact_id, 
                  contact_name,
                  user_id,
                  false,
                  jsonb_build_object(
                    'contact_id', NEW.contact_id,
                    'contact_name', contact_name,
                    'article_id', NEW.news_article_id,
                    'article_title', article_title,
                    'match_confidence', NEW.match_confidence,
                    'matched_text', NEW.matched_text,
                    'source', 'market_intelligence'
                  )
                );
              END LOOP;

              RETURN NEW;
            EXCEPTION 
              WHEN OTHERS THEN
                -- Log error but don't fail the INSERT
                RAISE WARNING 'Notification creation failed: %', SQLERRM;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `
        })

        if (fixError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fix function',
            details: fixError
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Function fixed - workspace_id ambiguity resolved'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Exception during function fix',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'test_insert') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for test insert')
      }
      
      // Test inserting a simple contact match to isolate the workspace_id error
      try {
        const { error } = await supabaseAdmin
          .from('news_contact_matches')
          .insert({
            news_article_id: 'c390c2da-4aff-4331-b75c-f74e65dd21ed', // A known article ID
            contact_id: '2fb39d33-332d-4efd-954a-c8535bc83135', // James Hartnell-Yeates ID
            match_type: 'name_mention',
            match_confidence: 0.5,
            matched_text: 'Test Match'
          })

        if (error) {
          return NextResponse.json({
            success: false,
            error: 'Insert failed',
            details: error
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Test insert succeeded'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Test insert exception',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'cleanup_duplicate_notifications') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for cleanup')
      }
      
      // Delete duplicate Market Intelligence notifications, keeping only the latest ones
      try {
        // For each contact+article combination, keep only the most recent notification per user
        const { data: duplicateGroups, error: groupError } = await supabaseAdmin.rpc('sql', {
          query: `
            WITH ranked_notifications AS (
              SELECT 
                id,
                user_id,
                (metadata->>'contact_id')::uuid as contact_id,
                (metadata->>'article_id')::uuid as article_id,
                created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY user_id, (metadata->>'contact_id')::uuid, (metadata->>'article_id')::uuid 
                  ORDER BY created_at DESC
                ) as rn
              FROM notifications 
              WHERE action_type = 'match' 
              AND metadata->>'source' = 'market_intelligence'
            )
            DELETE FROM notifications 
            WHERE id IN (
              SELECT id FROM ranked_notifications WHERE rn > 1
            );
          `
        })

        // Alternative approach if RPC doesn't work - delete older duplicates manually
        const { data: notifications, error: fetchError } = await supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('action_type', 'match')
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw new Error(`Error fetching notifications: ${fetchError.message}`)
        }

        // Group by contact+article+user and keep only the latest
        const groupedNotifications = new Map()
        const toDelete = []

        for (const notification of notifications || []) {
          const metadata = notification.metadata
          if (!metadata?.contact_id || !metadata?.article_id) continue

          const key = `${notification.user_id}-${metadata.contact_id}-${metadata.article_id}`
          
          if (groupedNotifications.has(key)) {
            // This is a duplicate - mark older one for deletion
            toDelete.push(notification.id)
          } else {
            // This is the first (latest) one for this group
            groupedNotifications.set(key, notification)
          }
        }

        if (toDelete.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .in('id', toDelete)

          if (deleteError) {
            throw new Error(`Error deleting duplicates: ${deleteError.message}`)
          }
        }

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${toDelete.length} duplicate notifications`,
          deleted_count: toDelete.length
        })

      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Cleanup failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'create_test_shared_notification') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for test notification')
      }
      
      // Manually create a shared notification for Margot Robbie to test the system
      try {
        const { error } = await supabaseAdmin
          .from('notifications')
          .insert({
            workspace_id: 'e6af33ea-7b8f-476f-afae-d88f40fa5413', // Known workspace ID
            user_id: null, // Shared notification
            title: 'Industry News Match',
            message: 'Margot Robbie has industry news matches',
            action_type: 'match',
            entity_type: 'contact',
            entity_id: '381bbefd-96dc-4a36-acaf-4af181ea5ba9', // Margot Robbie ID
            entity_title: 'Margot Robbie',
            actor_user_id: null, // System generated
            is_read: false,
            metadata: {
              contact_id: '381bbefd-96dc-4a36-acaf-4af181ea5ba9',
              contact_name: 'Margot Robbie',
              total_matches: 2,
              source: 'market_intelligence'
            }
          })

        if (error) {
          throw new Error(`Error creating test notification: ${error.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Test shared notification created for Margot Robbie'
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Test notification creation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (action === 'delete_all_market_intel_notifications') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for notification deletion')
      }
      
      // Delete all Market Intelligence notifications to start fresh with consolidated system
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('action_type', 'match')
        .eq('metadata->source', '"market_intelligence"')

      if (error) {
        throw new Error(`Error deleting MI notifications: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'All Market Intelligence notifications deleted'
      })
    }

    if (action === 'delete_james_notifications') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for James notification deletion')
      }
      
      // Delete false positive James notifications (low confidence matches that shouldn't exist)
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('entity_id', '2fb39d33-332d-4efd-954a-c8535bc83135') // James Hartnell-Yeates ID
        .eq('action_type', 'match')

      if (error) {
        throw new Error(`Error deleting James notifications: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'James false positive notifications deleted'
      })
    }

    if (action === 'delete_false_positives') {
      if (!supabaseAdmin) {
        throw new Error('Service role key required for deleting false positives')
      }
      
      // Delete false positive matches (like Stephen King matches on Stephen Emery)
      const { error } = await supabaseAdmin
        .from('news_contact_matches')
        .delete()
        .eq('contact_id', '0c90ed9a-8504-43d7-898a-321be0860a88') // Stephen Emery ID
        .eq('matched_text', 'Stephen')

      if (error) {
        throw new Error(`Error deleting false positives: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'False positive matches deleted'
      })
    }

    if (action === 'reset_specific_articles') {
      // Reset specific articles to unprocessed
      const { article_ids } = body
      const { error } = await supabase
        .from('news_articles')
        .update({ is_processed: false })
        .in('id', article_ids)

      if (error) {
        throw new Error(`Error resetting specific articles: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: `${article_ids.length} specific articles reset to unprocessed`
      })
    }

    if (action === 'reset_processing_status') {
      // Mark some articles as unprocessed for testing
      const { data: articles } = await supabase
        .from('news_articles')
        .select('id')
        .limit(5)

      if (!articles || articles.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No articles found to reset'
        })
      }

      const { error } = await supabase
        .from('news_articles')
        .update({ is_processed: false })
        .in('id', articles.map(a => a.id))

      if (error) {
        throw new Error(`Error resetting processing status: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Processing status reset for 5 articles'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    })

  } catch (error) {
    console.error('Debug POST error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Debug action failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}