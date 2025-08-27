import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get unread notification count for current user
export async function GET(request: NextRequest) {
  try {
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
        unread_count: 0
      })
    }

    // Get all shared notifications for user's workspaces
    const { data: sharedNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id')
      .in('workspace_id', workspaceIds)
      .is('user_id', null) // Only shared notifications
      .eq('action_type', 'match')

    if (notifError) {
      console.error('Error getting shared notifications:', notifError)
      return NextResponse.json(
        { success: false, error: 'Failed to get notifications' },
        { status: 500 }
      )
    }

    if (!sharedNotifications || sharedNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        unread_count: 0
      })
    }

    // Count how many of these notifications have NOT been read by this user
    let unreadCount = 0
    for (const notification of sharedNotifications) {
      const { data: isRead } = await supabase.rpc('is_notification_read_by_user', {
        notification_uuid: notification.id,
        user_uuid: user.id
      })
      
      if (!isRead) {
        unreadCount++
      }
    }

    return NextResponse.json({
      success: true,
      unread_count: unreadCount
    })

  } catch (error) {
    console.error('Unread count error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}