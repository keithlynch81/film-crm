'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Meeting = {
  id: string
  contact_id: string
  company_id: string | null
  meeting_type: string | null
  scheduled_at: string | null
  follow_up_due: string | null
  notes: string | null
  meeting_link: string | null
  contacts: {
    first_name: string
    last_name: string | null
    companies: {
      name: string
    } | null
  }
  companies: {
    name: string
  } | null
}

type TalkingPoint = {
  id: string
  project_id: string
  projects: {
    title: string
  }
}

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

const activeFilterStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
}

const meetingCardStyle = (isOverdue: boolean, hasFollowUpDue: boolean) => ({
  border: `1px solid ${isOverdue ? '#fecaca' : hasFollowUpDue ? '#fed7aa' : '#e5e7eb'}`,
  borderRadius: '8px',
  padding: '16px',
  background: isOverdue ? '#fef2f2' : hasFollowUpDue ? '#fff7ed' : '#ffffff',
  transition: 'all 0.2s',
})

const badgeStyle = (type: string) => {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  }
  
  switch (type) {
    case 'overdue':
      return { ...baseStyle, background: '#fef2f2', color: '#dc2626' }
    case 'due':
      return { ...baseStyle, background: '#fff7ed', color: '#ea580c' }
    case 'meeting':
      return { ...baseStyle, background: '#dbeafe', color: '#2563eb' }
    default:
      return { ...baseStyle, background: '#f3f4f6', color: '#6b7280' }
  }
}

export default function SchedulePage() {
  const { activeWorkspaceId } = useWorkspace()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [talkingPoints, setTalkingPoints] = useState<{[contactId: string]: TalkingPoint[]}>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'follow-ups'>('upcoming')
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    meeting_type: '',
    scheduled_at: '',
    follow_up_due: '',
    notes: '',
    meeting_link: ''
  })

  useEffect(() => {
    if (activeWorkspaceId) {
      loadMeetings()
      loadTalkingPoints()
    }
  }, [activeWorkspaceId])

  const loadMeetings = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        contacts:contact_id (
          first_name,
          last_name,
          companies:company_id (
            name
          )
        ),
        companies:company_id (
          name
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('scheduled_at', { ascending: true })

    if (error) {
      console.error('Error loading meetings:', error)
    } else {
      setMeetings(data || [])
    }
    setLoading(false)
  }

  const loadTalkingPoints = async () => {
    if (!activeWorkspaceId) return

    const { data, error } = await supabase
      .from('contact_talking_points')
      .select(`
        id,
        contact_id,
        project_id,
        projects:project_id (
          title
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading talking points:', error)
    } else {
      // Group talking points by contact_id
      const groupedTalkingPoints: {[contactId: string]: TalkingPoint[]} = {}
      data?.forEach(tp => {
        if (!groupedTalkingPoints[tp.contact_id]) {
          groupedTalkingPoints[tp.contact_id] = []
        }
        groupedTalkingPoints[tp.contact_id].push(tp)
      })
      setTalkingPoints(groupedTalkingPoints)
    }
  }

  const startEditing = (meeting: Meeting) => {
    setEditingMeeting(meeting.id)
    setEditForm({
      meeting_type: meeting.meeting_type || '',
      scheduled_at: meeting.scheduled_at ? new Date(meeting.scheduled_at).toISOString().slice(0, 16) : '',
      follow_up_due: meeting.follow_up_due ? new Date(meeting.follow_up_due).toISOString().slice(0, 10) : '',
      notes: meeting.notes || '',
      meeting_link: meeting.meeting_link || ''
    })
  }

  const saveEdit = async (meetingId: string) => {
    if (!activeWorkspaceId) return

    try {
      const updateData: any = {
        meeting_type: editForm.meeting_type || null,
        notes: editForm.notes || null,
        meeting_link: editForm.meeting_link || null
      }

      if (editForm.scheduled_at) {
        updateData.scheduled_at = new Date(editForm.scheduled_at).toISOString()
      }
      if (editForm.follow_up_due) {
        updateData.follow_up_due = new Date(editForm.follow_up_due).toISOString()
      }

      const { error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      setEditingMeeting(null)
      loadMeetings() // Refresh the list
    } catch (error: any) {
      console.error('Error updating meeting:', error)
      alert('Error updating meeting: ' + error.message)
    }
  }

  const cancelEdit = () => {
    setEditingMeeting(null)
    setEditForm({
      meeting_type: '',
      scheduled_at: '',
      follow_up_due: '',
      notes: '',
      meeting_link: ''
    })
  }

  const fixMeetingLink = (link: string) => {
    // Fix the localhost prefix issue
    if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
      return `https://${link}`
    }
    return link
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const filteredMeetings = meetings.filter(meeting => {
    if (!meeting.scheduled_at && filter !== 'all') return false

    const meetingDate = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null
    const followUpDate = meeting.follow_up_due ? new Date(meeting.follow_up_due) : null

    switch (filter) {
      case 'upcoming':
        return meetingDate && meetingDate >= today
      case 'past':
        return meetingDate && meetingDate < today
      case 'follow-ups':
        return followUpDate && followUpDate <= today
      case 'all':
      default:
        return true
    }
  })

  const upcomingCount = meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at) >= today).length
  const pastCount = meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at) < today).length
  const followUpCount = meetings.filter(m => m.follow_up_due && new Date(m.follow_up_due) <= today).length

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>Loading...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Schedule</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            View and manage your meetings and follow-ups.
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '32px', padding: '0 24px' }}>
              {[
                { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
                { id: 'past', label: 'Past', count: pastCount },
                { id: 'follow-ups', label: 'Follow-ups Due', count: followUpCount },
                { id: 'all', label: 'All', count: meetings.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 0',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: filter === tab.id ? '#3b82f6' : '#6b7280',
                    borderBottom: filter === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      background: filter === tab.id ? '#dbeafe' : '#f3f4f6',
                      color: filter === tab.id ? '#3b82f6' : '#6b7280',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Meetings List */}
          <div style={{ padding: '24px' }}>
            {filteredMeetings.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
                {meetings.length === 0 ? (
                  <div>
                    <p style={{ margin: '0 0 8px 0' }}>No meetings scheduled yet.</p>
                    <p style={{ fontSize: '14px', margin: 0 }}>
                      Meetings can be added from{' '}
                      <Link href="/contacts" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        contact pages
                      </Link>
                      .
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>No meetings match the current filter.</p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredMeetings.map((meeting) => {
                  const isOverdue = meeting.scheduled_at && new Date(meeting.scheduled_at) < now
                  const hasFollowUpDue = meeting.follow_up_due && new Date(meeting.follow_up_due) <= today
                  
                  return (
                    <div
                      key={meeting.id}
                      style={meetingCardStyle(!!isOverdue, !!hasFollowUpDue)}
                    >
                      {editingMeeting === meeting.id ? (
                        // Edit Mode
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                              Editing: {meeting.contacts.first_name} {meeting.contacts.last_name}
                            </h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => saveEdit(meeting.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#6b7280',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                Meeting Type
                              </label>
                              <input
                                type="text"
                                value={editForm.meeting_type}
                                onChange={(e) => setEditForm({...editForm, meeting_type: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                                placeholder="e.g., General, Pitch, Follow-up"
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                Scheduled Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                value={editForm.scheduled_at}
                                onChange={(e) => setEditForm({...editForm, scheduled_at: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                Follow-up Due
                              </label>
                              <input
                                type="date"
                                value={editForm.follow_up_due}
                                onChange={(e) => setEditForm({...editForm, follow_up_due: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                Meeting Link
                              </label>
                              <input
                                type="url"
                                value={editForm.meeting_link}
                                onChange={(e) => setEditForm({...editForm, meeting_link: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                                placeholder="https://zoom.us/..."
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                              Notes
                            </label>
                            <textarea
                              value={editForm.notes}
                              onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                minHeight: '80px',
                                resize: 'vertical'
                              }}
                              placeholder="Meeting notes..."
                            />
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                <Link
                                  href={`/contacts/${meeting.contact_id}`}
                                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                                >
                                  {meeting.contacts.first_name} {meeting.contacts.last_name}
                                </Link>
                              </h3>
                              {meeting.meeting_type && (
                                <span style={badgeStyle('meeting')}>
                                  {meeting.meeting_type}
                                </span>
                              )}
                              {isOverdue && (
                                <span style={badgeStyle('overdue')}>
                                  Overdue
                                </span>
                              )}
                              {hasFollowUpDue && (
                                <span style={badgeStyle('due')}>
                                  Follow-up Due
                                </span>
                              )}
                            </div>
                            
                            {/* Edit Button in top right */}
                            <button
                              onClick={() => startEditing(meeting)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
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
                              Edit
                            </button>
                          </div>
                          
                          {(meeting.contacts.companies?.name || meeting.companies?.name) && (
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6b7280' }}>
                              {meeting.contacts.companies?.name || meeting.companies?.name}
                            </p>
                          )}

                          {meeting.scheduled_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span style={{ fontSize: '14px', color: '#374151' }}>
                                {new Date(meeting.scheduled_at).toLocaleDateString('en-GB')} at{' '}
                                {new Date(meeting.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>
                          )}

                          {meeting.follow_up_due && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span style={{ fontSize: '14px', color: hasFollowUpDue ? '#ea580c' : '#6b7280' }}>
                                Follow-up due: {new Date(meeting.follow_up_due).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}

                          {meeting.meeting_link && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <a
                                href={fixMeetingLink(meeting.meeting_link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '14px',
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontWeight: '500'
                                }}
                              >
                                Join Meeting
                              </a>
                            </div>
                          )}

                          {meeting.notes && (
                            <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                              {meeting.notes}
                            </p>
                          )}

                          {/* Talking Points Section */}
                          {talkingPoints[meeting.contact_id] && talkingPoints[meeting.contact_id].length > 0 && (
                            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                  Talking Points ({talkingPoints[meeting.contact_id].length})
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {talkingPoints[meeting.contact_id].map((tp) => (
                                  <div
                                    key={tp.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px 8px',
                                      background: '#ffffff',
                                      borderRadius: '4px',
                                      border: '1px solid #e5e7eb'
                                    }}
                                  >
                                    <div style={{
                                      width: '6px',
                                      height: '6px',
                                      background: '#3b82f6',
                                      borderRadius: '50%',
                                      flexShrink: 0
                                    }} />
                                    <a
                                      href={`/projects/${tp.project_id}`}
                                      style={{
                                        fontSize: '13px',
                                        color: '#3b82f6',
                                        textDecoration: 'none',
                                        fontWeight: '500'
                                      }}
                                    >
                                      {tp.projects.title}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {meetings.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>Quick Stats</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{meetings.length}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Meetings</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{upcomingCount}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Upcoming</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{pastCount}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>{followUpCount}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Follow-ups Due</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}