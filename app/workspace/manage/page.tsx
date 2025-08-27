'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Invite = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const pillButtonStyle = {
  padding: '8px 16px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: '500',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const primaryButtonStyle = {
  ...pillButtonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
}

const secondaryButtonStyle = {
  ...pillButtonStyle,
  background: '#ffffff',
  color: '#374151',
  borderColor: '#d1d5db',
}

const dangerButtonStyle = {
  ...pillButtonStyle,
  background: '#dc2626',
  color: '#ffffff',
  borderColor: '#dc2626',
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px'
}

export default function WorkspaceManagePage() {
  const { workspaces, activeWorkspaceId, refreshWorkspaces, user } = useWorkspace()
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name)
      loadInvites()
    }
  }, [activeWorkspace])

  const loadInvites = async () => {
    if (!activeWorkspaceId) return

    const { data, error } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading invites:', error)
    } else {
      setInvites(data || [])
    }
  }

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !canManage) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: workspaceName })
        .eq('id', activeWorkspaceId)

      if (error) throw error

      await refreshWorkspaces()
      setMessage('Workspace renamed successfully')
    } catch (error: any) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspaceId || !user) return
    
    const confirm = window.confirm('Are you sure you want to leave this workspace?')
    if (!confirm) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', user.id)

      if (error) throw error

      await refreshWorkspaces()
      router.push('/projects')
    } catch (error: any) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert([{ name: newWorkspaceName }])
        .select()
        .single()

      if (workspaceError) throw workspaceError

      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert([{
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner'
        }])

      if (memberError) throw memberError

      await refreshWorkspaces()
      setNewWorkspaceName('')
      setMessage('Workspace created successfully')
    } catch (error: any) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !user || !canManage) return

    setLoading(true)
    try {
      const { data: invite, error } = await supabase
        .from('workspace_invites')
        .insert([{
          workspace_id: activeWorkspaceId,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user.id
        }])
        .select()
        .single()

      if (error) throw error

      // Generate shareable invite link
      const inviteUrl = `${window.location.origin}/invites/${invite.id}`
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteUrl)
        setMessage(`Invitation created! Invite link copied to clipboard. Share this link: ${inviteUrl}`)
      } catch (clipboardError) {
        setMessage(`Invitation created! Share this link with ${inviteEmail}: ${inviteUrl}`)
      }

      setInviteEmail('')
      await loadInvites()
    } catch (error: any) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  const copyInviteLink = async (inviteId: string) => {
    const inviteUrl = `${window.location.origin}/invites/${inviteId}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setMessage(`Invite link copied to clipboard: ${inviteUrl}`)
    } catch (error) {
      setMessage(`Invite link: ${inviteUrl}`)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', inviteId)

      if (error) throw error

      await loadInvites()
      setMessage('Invitation revoked successfully')
    } catch (error: any) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Workspace Management</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Manage your workspaces, invite team members, and configure settings.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            background: message.includes('successfully') ? '#f0fdf4' : '#fef2f2',
            color: message.includes('successfully') ? '#15803d' : '#dc2626',
            border: `1px solid ${message.includes('successfully') ? '#bbf7d0' : '#fecaca'}`
          }}>
            {message}
          </div>
        )}

        {/* Current Workspace */}
        {activeWorkspace && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: '0 0 16px 0' }}>Current Workspace</h2>
            
            <form onSubmit={handleRenameWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={!canManage}
                  style={{
                    ...inputStyle,
                    backgroundColor: !canManage ? '#f9fafb' : '#ffffff',
                    cursor: !canManage ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                {canManage && (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...primaryButtonStyle,
                      opacity: loading ? '0.5' : '1',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Saving...' : 'Rename Workspace'}
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  disabled={loading}
                  style={{
                    ...dangerButtonStyle,
                    opacity: loading ? '0.5' : '1',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Leave Workspace
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create New Workspace */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: '0 0 16px 0' }}>Create New Workspace</h2>
          
          <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Workspace Name
              </label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
                style={inputStyle}
                placeholder="Enter workspace name"
              />
            </div>
            
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
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>

        {/* Invite Users */}
        {canManage && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: '0 0 16px 0' }}>Invite Team Members</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
              Create invitation links that you can share with team members. Each invite will generate a unique link that can be copied and shared manually.
            </p>
            
            <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  style={inputStyle}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
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
                  {loading ? 'Creating...' : 'Create Invite Link'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending Invites */}
        {canManage && invites.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: '0 0 16px 0' }}>Pending Invitations</h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Email
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Role
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Invited
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {invite.email}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {invite.role}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          ...(invite.status === 'pending' ? { background: '#fef3c7', color: '#92400e' } :
                              invite.status === 'accepted' ? { background: '#d1fae5', color: '#065f46' } :
                              { background: '#fee2e2', color: '#991b1b' })
                        }}>
                          {invite.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(invite.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => copyInviteLink(invite.id)}
                            style={{
                              ...secondaryButtonStyle,
                              padding: '4px 8px',
                              fontSize: '12px'
                            }}
                          >
                            Copy Link
                          </button>
                          {invite.status === 'pending' && (
                            <button
                              onClick={() => revokeInvite(invite.id)}
                              style={{
                                ...dangerButtonStyle,
                                padding: '4px 8px',
                                fontSize: '12px'
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}