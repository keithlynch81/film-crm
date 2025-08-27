'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type InviteStatus = 'loading' | 'not-found' | 'already-accepted' | 'wrong-user' | 'ready' | 'accepting' | 'success' | 'error'

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const { status: authStatus, user, refreshWorkspaces } = useWorkspace()
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<any>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (authStatus === 'authenticated' && user && params.id) {
      checkInvite()
    } else if (authStatus === 'unauthenticated') {
      // Redirect to login with invite context
      router.push(`/login?invite=${params.id}`)
    }
  }, [authStatus, user, params.id])

  const checkInvite = async () => {
    if (!user || !params.id) return

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select(`
          *,
          workspaces:workspace_id (
            name
          )
        `)
        .eq('id', params.id)
        .single()

      if (error || !data) {
        setInviteStatus('not-found')
        setMessage('Invite not found or has expired.')
        return
      }

      setInvite(data)

      if (data.status === 'accepted') {
        setInviteStatus('already-accepted')
        setMessage('This invitation has already been accepted.')
        return
      }

      if (data.status === 'revoked') {
        setInviteStatus('not-found')
        setMessage('This invitation has been revoked.')
        return
      }

      if (data.email.toLowerCase() !== user.email?.toLowerCase()) {
        setInviteStatus('wrong-user')
        setMessage(`This invitation is for ${data.email}, but you are logged in as ${user.email}.`)
        return
      }

      setInviteStatus('ready')
    } catch (error) {
      console.error('Error checking invite:', error)
      setInviteStatus('error')
      setMessage('An error occurred while checking the invitation.')
    }
  }

  const acceptInvite = async () => {
    if (!params.id) return

    setInviteStatus('accepting')
    
    try {
      const { data, error } = await supabase.rpc('accept_workspace_invite', {
        invite_id: params.id as string
      })

      if (error) throw error

      if (data.success) {
        setInviteStatus('success')
        setMessage('Invitation accepted successfully!')
        await refreshWorkspaces()
        
        // Redirect to projects after a short delay
        setTimeout(() => {
          router.push('/projects')
        }, 2000)
      } else {
        setInviteStatus('error')
        setMessage(data.error || 'Failed to accept invitation.')
      }
    } catch (error: any) {
      console.error('Error accepting invite:', error)
      setInviteStatus('error')
      setMessage(error.message || 'Failed to accept invitation.')
    }
  }

  if (authStatus === 'loading' || inviteStatus === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ maxWidth: '448px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ maxWidth: '448px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>Sign in required</h2>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
              You need to sign in to accept this invitation.
            </p>
            <Link
              href="/login"
              style={{
                marginTop: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '6px',
                color: '#ffffff',
                background: '#3b82f6',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ maxWidth: '448px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          {inviteStatus === 'ready' && invite && (
            <>
              <div style={{ 
                margin: '0 auto', 
                height: '48px', 
                width: '48px', 
                background: '#dcfce7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ height: '24px', width: '24px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
                </svg>
              </div>
              <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
                You're invited!
              </h2>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                You've been invited to join the workspace <strong>{invite.workspaces.name}</strong> as a{' '}
                <strong>{invite.role}</strong>.
              </p>
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                Invited by: {invite.email}
              </p>
              <button
                onClick={acceptInvite}
                style={{
                  marginTop: '24px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ffffff',
                  background: '#3b82f6',
                  cursor: 'pointer'
                }}
              >
                Accept Invitation
              </button>
            </>
          )}

          {inviteStatus === 'accepting' && (
            <>
              <div style={{ 
                margin: '0 auto', 
                height: '48px', 
                width: '48px', 
                background: '#e0e7ff', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ height: '24px', width: '24px', color: '#4f46e5', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: '0.25' }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: '0.75' }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
                Accepting invitation...
              </h2>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </>
          )}

          {inviteStatus === 'success' && (
            <>
              <div style={{ 
                margin: '0 auto', 
                height: '48px', 
                width: '48px', 
                background: '#dcfce7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ height: '24px', width: '24px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
                Welcome aboard!
              </h2>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                {message}
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#9ca3af' }}>
                Redirecting you to the app...
              </p>
            </>
          )}

          {(inviteStatus === 'not-found' || inviteStatus === 'already-accepted' || inviteStatus === 'wrong-user' || inviteStatus === 'error') && (
            <>
              <div style={{ 
                margin: '0 auto', 
                height: '48px', 
                width: '48px', 
                background: '#fee2e2', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ height: '24px', width: '24px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 style={{ marginTop: '24px', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
                {inviteStatus === 'wrong-user' ? 'Wrong account' : 
                 inviteStatus === 'already-accepted' ? 'Already accepted' : 
                 'Invitation not found'}
              </h2>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                {message}
              </p>
              
              {inviteStatus === 'wrong-user' && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link
                    href="/login"
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#ffffff',
                      background: '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    Sign in with correct account
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.push('/login')
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Sign out and try again
                  </button>
                </div>
              )}
              
              {inviteStatus === 'already-accepted' && (
                <Link
                  href="/projects"
                  style={{
                    marginTop: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    color: '#ffffff',
                    background: '#3b82f6',
                    textDecoration: 'none'
                  }}
                >
                  Go to App
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}