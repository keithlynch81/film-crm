'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from './workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  title: string
  message: string
  action_type: string
  entity_type: string
  entity_id: string
  entity_title: string | null
  is_read: boolean
  created_at: string
  actor_user_id: string
}

const notificationIconStyle = {
  position: 'relative' as const,
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  transition: 'background-color 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const notificationBadgeStyle = {
  position: 'absolute' as const,
  top: '2px',
  right: '2px',
  width: '12px',
  height: '12px',
  background: '#dc2626',
  borderRadius: '50%',
  fontSize: '8px',
  fontWeight: 'bold',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '12px',
}

const dropdownStyle = {
  position: 'absolute' as const,
  top: '100%',
  right: '0',
  width: '400px',
  maxHeight: '500px',
  overflowY: 'auto' as const,
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  zIndex: 1000,
  marginTop: '8px',
}

const notificationItemStyle = {
  padding: '16px',
  borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
}

const unreadNotificationStyle = {
  ...notificationItemStyle,
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #3b82f6',
}

const readNotificationStyle = {
  ...notificationItemStyle,
  backgroundColor: '#ffffff',
}

export function NotificationDropdown() {
  const { activeWorkspaceId } = useWorkspace()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeWorkspaceId) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadNotifications = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading notifications:', error)
    } else {
      setNotifications(data || [])
    }
    setLoading(false)
  }

  const loadUnreadCount = async () => {
    if (!activeWorkspaceId) return

    const { data, error } = await supabase
      .rpc('get_unread_notification_count', {
        p_workspace_id: activeWorkspaceId
      })

    if (error) {
      console.error('Error loading unread count:', error)
    } else {
      setUnreadCount(data || 0)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .rpc('mark_notification_read', {
        notification_id: notificationId
      })

    if (error) {
      console.error('Error marking notification as read:', error)
    } else {
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    if (!activeWorkspaceId) return

    const { error } = await supabase
      .rpc('mark_all_notifications_read', {
        p_workspace_id: activeWorkspaceId
      })

    if (error) {
      console.error('Error marking all notifications as read:', error)
    } else {
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate to the relevant entity
    let targetPath = '/'
    switch (notification.entity_type) {
      case 'project':
        targetPath = `/projects/${notification.entity_id}`
        break
      case 'contact':
        targetPath = `/contacts/${notification.entity_id}`
        break
      case 'meeting':
        targetPath = `/schedule`
        break
      case 'submission':
        targetPath = `/submissions`
        break
      default:
        targetPath = '/'
    }

    setShowDropdown(false)
    router.push(targetPath)
  }

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev)
    if (!showDropdown && notifications.length === 0) {
      loadNotifications()
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={toggleDropdown}
        style={{
          ...notificationIconStyle,
          backgroundColor: showDropdown ? '#f3f4f6' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!showDropdown) e.currentTarget.style.backgroundColor = '#f9fafb'
        }}
        onMouseLeave={(e) => {
          if (!showDropdown) e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {/* Bell Icon (simplified SVG) */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        
        {unreadCount > 0 && (
          <div style={notificationBadgeStyle}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>

      {showDropdown && (
        <div style={dropdownStyle}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={notification.is_read ? readNotificationStyle : unreadNotificationStyle}
                  onClick={() => handleNotificationClick(notification)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read ? '#f9fafb' : '#e0f2fe'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.is_read ? '#ffffff' : '#f0f9ff'
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: '2px'
                    }}>
                      {notification.title}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#6b7280',
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{getTimeAgo(notification.created_at)}</span>
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}