'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useWorkspace } from './workspace/WorkspaceProvider'
import { NotificationDropdown } from './NotificationDropdown'
import { UserProfileDropdown } from './UserProfileDropdown'
import { supabase } from '@/lib/supabase'

type LayoutProps = {
  children: React.ReactNode
}

const navTabStyle = {
  padding: '8px 16px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  transition: 'all 0.2s',
  display: 'inline-block',
}

const activeTabStyle = {
  ...navTabStyle,
  background: '#3b82f6',
  color: '#ffffff',
}

const inactiveTabStyle = {
  ...navTabStyle,
  background: '#f3f4f6',
  color: '#374151',
}

export function Layout({ children }: LayoutProps) {
  const { status } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }

  if (status === 'loading') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>
  }

  if (status === 'unauthenticated') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Redirecting...</div>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '16px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <Link href="/projects" style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/fiink_logo.png"
                  alt="Fiink"
                  width={80}
                  height={32}
                  style={{ height: 'auto' }}
                />
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href="/projects"
                  style={isActive('/projects') ? activeTabStyle : inactiveTabStyle}
                >
                  Projects
                </Link>
              <Link
                href="/contacts"
                style={isActive('/contacts') ? activeTabStyle : inactiveTabStyle}
              >
                Contacts
              </Link>
              <Link
                href="/submissions"
                style={isActive('/submissions') ? activeTabStyle : inactiveTabStyle}
              >
                Submissions
              </Link>
              <Link
                href="/schedule"
                style={isActive('/schedule') ? activeTabStyle : inactiveTabStyle}
              >
                Schedule
              </Link>
              <Link
                href="/analytics"
                style={isActive('/analytics') ? activeTabStyle : inactiveTabStyle}
              >
                Analytics
              </Link>
              <Link
                href="/notebook"
                style={isActive('/notebook') ? activeTabStyle : inactiveTabStyle}
              >
                Notebook
              </Link>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <NotificationDropdown />
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}