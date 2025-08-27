import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mark a shared notification as read for the current user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notification_id } = body

    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'notification_id is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's workspace for this notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('workspace_id')
      .eq('id', notification_id)
      .single()

    if (notifError || !notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Mark notification as read for this user using the stored procedure
    const { error: markReadError } = await supabase.rpc('mark_notification_read', {
      notification_uuid: notification_id,
      user_uuid: user.id,
      workspace_uuid: notification.workspace_id
    })

    if (markReadError) {
      console.error('Error marking notification as read:', markReadError)
      return NextResponse.json(
        { success: false, error: 'Failed to mark as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    console.error('Read notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}