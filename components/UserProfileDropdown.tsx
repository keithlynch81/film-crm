'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from './workspace/WorkspaceProvider'
import { WorkspaceSwitcher } from './workspace/WorkspaceSwitcher'
import { supabase } from '@/lib/supabase'

const profileIconStyle = {
  position: 'relative' as const,
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  transition: 'background-color 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const dropdownStyle = {
  position: 'absolute' as const,
  top: '100%',
  right: '0',
  width: '280px',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  zIndex: 1000,
  marginTop: '8px',
  overflow: 'visible' as const, // Allow select dropdown to extend beyond container
}

const userInfoStyle = {
  padding: '16px',
  borderBottom: '1px solid #f3f4f6',
}

const workspaceSectionStyle = {
  padding: '16px',
  paddingBottom: '24px', // Extra padding to accommodate workspace dropdown
  borderBottom: '1px solid #f3f4f6',
}

const logoutSectionStyle = {
  padding: '12px 16px',
}

export function UserProfileDropdown() {
  const { user } = useWorkspace()
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev)
  }

  // Get user's display name (first part of email or full email if no @)
  const getUserDisplayName = () => {
    if (!user?.email) return 'User'
    const emailParts = user.email.split('@')
    return emailParts[0] || user.email
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={toggleDropdown}
        style={{
          ...profileIconStyle,
          backgroundColor: showDropdown ? '#f3f4f6' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!showDropdown) e.currentTarget.style.backgroundColor = '#f9fafb'
        }}
        onMouseLeave={(e) => {
          if (!showDropdown) e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {/* Person Icon (simplified SVG) */}
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
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>

      {showDropdown && (
        <div style={dropdownStyle}>
          {/* User Info Section */}
          <div style={userInfoStyle}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '4px'
            }}>
              {getUserDisplayName()}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              wordBreak: 'break-all' as const
            }}>
              {user?.email}
            </div>
          </div>

          {/* Workspace Section */}
          <div style={workspaceSectionStyle}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '12px'
            }}>
              Workspace
            </div>
            <WorkspaceSwitcher />
          </div>

          {/* Logout Section */}
          <div style={logoutSectionStyle}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center' as const,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.color = '#374151'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}