'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'

const buttonStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  border: '1px solid #d1d5db',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'inline-block',
  background: '#ffffff',
  color: '#374151',
}

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
  width: '100%',
  justifyContent: 'center',
  display: 'flex',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { status, user } = useWorkspace()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteId = searchParams.get('invite')
  const [inviteEmail, setInviteEmail] = useState('')

  // Load invite information if invite ID is present
  useEffect(() => {
    if (inviteId && status === 'unauthenticated') {
      loadInviteInfo()
      setIsSignUp(true) // Default to signup for invite links
    }
  }, [inviteId, status])

  const loadInviteInfo = async () => {
    if (!inviteId) return
    
    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('email, workspaces:workspace_id(name)')
        .eq('id', inviteId)
        .single()

      if (!error && data) {
        setInviteEmail(data.email)
        setEmail(data.email) // Pre-fill the email field
        setMessage(`You've been invited to join ${data.workspaces?.name || 'a workspace'}. Please create an account or sign in with ${data.email}.`)
      }
    } catch (error) {
      console.error('Error loading invite:', error)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && user) {
      // If there's an invite ID, redirect to the invite page
      if (inviteId) {
        router.push(`/invites/${inviteId}`)
      } else {
        router.push('/projects')
      }
    }
  }, [status, user, router, inviteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Validate email matches invite if present
      if (inviteId && inviteEmail && email.toLowerCase() !== inviteEmail.toLowerCase()) {
        setMessage(`This invitation is for ${inviteEmail}. Please use that email address.`)
        setLoading(false)
        return
      }

      if (isSignUp) {
        const redirectTo = inviteId 
          ? `${window.location.origin}/login?invite=${inviteId}`
          : undefined
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo
          }
        })
        
        if (error) throw error
        
        if (inviteId) {
          setMessage(`Account created! Please check your email to confirm your account. The confirmation email will redirect you back here to complete the workspace invitation.`)
        } else {
          setMessage('Check your email to confirm your account')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        // Redirect based on whether there's an invite
        if (inviteId) {
          router.push(`/invites/${inviteId}`)
        } else {
          router.push('/projects')
        }
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>
  }

  if (status === 'authenticated') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Redirecting...</div>
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ maxWidth: '384px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h2 style={{ marginTop: '24px', textAlign: 'center', fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>
        <form style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                readOnly={!!inviteEmail}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px',
                  backgroundColor: inviteEmail ? '#f9fafb' : '#ffffff'
                }}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div style={{ fontSize: '14px', color: message.includes('Check your email') ? '#16a34a' : '#dc2626' }}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                opacity: loading ? '0.5' : '1',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' }}
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}