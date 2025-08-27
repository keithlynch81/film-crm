'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from './WorkspaceProvider'

const dropdownButtonStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  background: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  textAlign: 'left' as const,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'all 0.2s',
}

const dropdownMenuStyle = {
  position: 'absolute' as const,
  top: '100%',
  left: '0',
  right: '0',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  zIndex: 1000,
  marginTop: '2px',
  maxHeight: '200px',
  overflowY: 'auto' as const,
}

const menuItemStyle = {
  padding: '8px 12px',
  fontSize: '14px',
  color: '#374151',
  cursor: 'pointer',
  borderBottom: '1px solid #f3f4f6',
  transition: 'background-color 0.2s',
}

const lastMenuItemStyle = {
  ...menuItemStyle,
  borderBottom: 'none', // Remove border from last item
}

const manageItemStyle = {
  ...menuItemStyle,
  borderTop: '1px solid #e5e7eb',
  borderBottom: 'none',
  color: '#6b7280',
  fontStyle: 'italic' as const,
}

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleItemClick = (value: string) => {
    setIsOpen(false)
    
    if (value === 'manage') {
      router.push('/workspace/manage')
    } else {
      setActiveWorkspaceId(value)
    }
  }

  const getActiveWorkspaceName = () => {
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
    return activeWorkspace?.name || 'Select workspace'
  }

  if (workspaces.length === 0) {
    return null
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...dropdownButtonStyle,
          borderColor: isOpen ? '#3b82f6' : '#d1d5db',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = '#9ca3af'
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = '#d1d5db'
        }}
      >
        <span>{getActiveWorkspaceName()}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div style={dropdownMenuStyle}>
          {workspaces.map((workspace, index) => (
            <div
              key={workspace.id}
              onClick={() => handleItemClick(workspace.id)}
              style={{
                ...(index === workspaces.length - 1 ? lastMenuItemStyle : menuItemStyle),
                backgroundColor: workspace.id === activeWorkspaceId ? '#eff6ff' : 'transparent',
                fontWeight: workspace.id === activeWorkspaceId ? '500' : 'normal',
              }}
              onMouseEnter={(e) => {
                if (workspace.id !== activeWorkspaceId) {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }
              }}
              onMouseLeave={(e) => {
                if (workspace.id !== activeWorkspaceId) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {workspace.name}
            </div>
          ))}
          <div
            onClick={() => handleItemClick('manage')}
            style={manageItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            — Manage workspaces…
          </div>
        </div>
      )}
    </div>
  )
}