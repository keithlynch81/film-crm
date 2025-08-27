import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get notifications with read status for current user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's workspaces
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)

    if (workspaceError || !workspaces) {
      return NextResponse.json(
        { success: false, error: 'Failed to get workspaces' },
        { status: 500 }
      )
    }

    const workspaceIds = workspaces.map(w => w.workspace_id)

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        success: true,
        notifications: []
      })
    }

    // Get shared notifications for user's workspaces
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .in('workspace_id', workspaceIds)
      .is('user_id', null) // Only shared notifications  
      .eq('action_type', 'match')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notifError) {
      console.error('Error getting notifications:', notifError)
      return NextResponse.json(
        { success: false, error: 'Failed to get notifications' },
        { status: 500 }
      )
    }

    // Add read status for current user to each notification
    const notificationsWithReadStatus = []
    for (const notification of notifications || []) {
      const { data: isRead } = await supabase.rpc('is_notification_read_by_user', {
        notification_uuid: notification.id,
        user_uuid: user.id
      })

      notificationsWithReadStatus.push({
        ...notification,
        is_read_by_user: Boolean(isRead)
      })
    }

    return NextResponse.json({
      success: true,
      notifications: notificationsWithReadStatus
    })

  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}