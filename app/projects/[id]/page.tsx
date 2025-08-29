'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Project = {
  id: string
  title: string
  logline: string | null
  status: string | null
  stage: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  project_mediums: { mediums: { name: string } }[]
  project_genres: { genres: { name: string } }[]
  project_budget_ranges: { budget_ranges: { label: string } }[]
}

type Submission = {
  id: string
  project_id: string
  contact_id: string
  status: string | null
  submitted_at: string
  notes: string | null
  feedback: string | null
  contacts: {
    first_name: string
    last_name: string | null
    email: string | null
    companies: {
      name: string
    } | null
  }
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  companies: {
    name: string
  } | null
}

type TalkingPoint = {
  id: string
  contact_id: string
  created_at: string
  contacts: {
    first_name: string
    last_name: string | null
    companies: {
      name: string
    } | null
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

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#ffffff',
  color: '#374151',
  borderColor: '#d1d5db',
}

const tagStyle = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '500',
  background: '#e5e7eb',
  color: '#374151',
  display: 'inline-block',
}

const statusBadgeStyle = (status: string | null) => {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  }
  
  switch (status) {
    case 'Accepted':
      return { ...baseStyle, background: '#dcfce7', color: '#166534' }
    case 'Rejected':
      return { ...baseStyle, background: '#fef2f2', color: '#dc2626' }
    case 'Under Review':
      return { ...baseStyle, background: '#fef3c7', color: '#d97706' }
    case 'Shortlisted':
      return { ...baseStyle, background: '#dbeafe', color: '#2563eb' }
    default:
      return { ...baseStyle, background: '#f3f4f6', color: '#6b7280' }
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeWorkspaceId } = useWorkspace()
  const [project, setProject] = useState<Project | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([])
  const [selectedContact, setSelectedContact] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [newSubmission, setNewSubmission] = useState({
    contact_id: '',
    status: '',
    notes: ''
  })
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null)
  const [editSubmissionData, setEditSubmissionData] = useState({
    status: '',
    notes: ''
  })

  useEffect(() => {
    if (activeWorkspaceId && params.id) {
      loadProject()
      loadSubmissions()
      loadContacts()
      loadTalkingPoints()
    }
  }, [activeWorkspaceId, params.id])

  const loadProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_mediums(mediums(name)),
        project_genres(genres(name)),
        project_budget_ranges(budget_ranges(label))
      `)
      .eq('id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .single()

    if (error) {
      console.error('Error loading project:', error)
      router.push('/projects')
    } else {
      setProject(data)
    }
  }

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        contacts:contact_id (
          first_name,
          last_name,
          email,
          companies:company_id (
            name
          )
        )
      `)
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading submissions:', error)
    } else {
      setSubmissions(data || [])
    }
  }

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        companies:company_id (
          name
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('first_name')

    if (error) {
      console.error('Error loading contacts:', error)
    } else {
      setContacts((data as unknown as Contact[]) || [])
    }
    setLoading(false)
  }

  const loadTalkingPoints = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('contact_talking_points')
      .select(`
        *,
        contacts:contact_id (
          first_name,
          last_name,
          companies:company_id (
            name
          )
        )
      `)
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading talking points:', error)
    } else {
      setTalkingPoints(data || [])
    }
  }

  const addTalkingPoint = async () => {
    if (!activeWorkspaceId || !params.id || !selectedContact) return

    try {
      const { error } = await supabase
        .from('contact_talking_points')
        .insert([{
          workspace_id: activeWorkspaceId,
          contact_id: selectedContact,
          project_id: params.id as string
        }])

      if (error) throw error
      
      setSelectedContact('')
      loadTalkingPoints()
    } catch (error: any) {
      console.error('Error adding talking point:', error)
      alert('Error adding talking point: ' + error.message)
    }
  }

  const removeTalkingPoint = async (contactId: string) => {
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('contact_talking_points')
        .delete()
        .eq('contact_id', contactId)
        .eq('project_id', params.id)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error
      
      loadTalkingPoints()
    } catch (error: any) {
      console.error('Error removing talking point:', error)
      alert('Error removing talking point: ' + error.message)
    }
  }

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('submissions')
        .insert([{
          workspace_id: activeWorkspaceId,
          project_id: params.id as string,
          contact_id: newSubmission.contact_id,
          status: newSubmission.status || null,
          notes: newSubmission.notes || null
        }])

      if (error) throw error

      setNewSubmission({ contact_id: '', status: '', notes: '' })
      setShowSubmissionForm(false)
      loadSubmissions()
    } catch (error: any) {
      console.error('Error creating submission:', error)
      alert('Error creating submission: ' + error.message)
    }
  }

  const startEditingSubmission = (submission: Submission) => {
    setEditingSubmission(submission.id)
    setEditSubmissionData({
      status: submission.status || '',
      notes: submission.notes || ''
    })
  }

  const cancelEditSubmission = () => {
    setEditingSubmission(null)
    setEditSubmissionData({ status: '', notes: '' })
  }

  const handleEditSubmissionSubmit = async (submissionId: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: editSubmissionData.status || null,
          notes: editSubmissionData.notes || null
        })
        .eq('id', submissionId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      setEditingSubmission(null)
      setEditSubmissionData({ status: '', notes: '' })
      loadSubmissions()
    } catch (error: any) {
      console.error('Error updating submission:', error)
      alert('Error updating submission: ' + error.message)
    }
  }

  const deleteSubmission = async (submissionId: string) => {
    if (!activeWorkspaceId) return
    if (!confirm('Are you sure you want to delete this submission?')) return

    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      loadSubmissions()
    } catch (error: any) {
      console.error('Error deleting submission:', error)
      alert('Error deleting submission: ' + error.message)
    }
  }

  const renderNotesWithLinks = (text: string) => {
    // URL regex pattern that matches http/https URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlPattern)
    
    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        // This is a URL
        const displayUrl = part.length > 50 ? part.substring(0, 47) + '...' : part
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
            title={part} // Show full URL on hover
          >
            {displayUrl}
          </a>
        )
      } else {
        // Regular text
        return part
      }
    })
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>Loading...</div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          <p style={{ margin: '0 0 16px 0' }}>Project not found</p>
          <Link href="/projects" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Back to Projects
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Return Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href="/projects"
            style={{
              ...secondaryButtonStyle,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Return to Project Overview
          </Link>
        </div>
        
        {/* Project Header */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', position: 'relative' }}>
          <div className="detail-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="detail-page-content" style={{ flex: 1 }}>
              {/* Title and Medium */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0' }}>{project.title}</h1>
                {project.project_mediums && project.project_mediums.length > 0 && (
                  <span style={{ fontSize: '18px', color: '#6b7280', fontWeight: '500' }}>
                    {project.project_mediums.map(pm => pm.mediums.name).join(', ')}
                  </span>
                )}
              </div>
              
              {/* Genre */}
              {project.project_genres && project.project_genres.length > 0 && (
                <div style={{ marginBottom: '8px', fontSize: '16px', color: '#374151' }}>
                  {project.project_genres.map(pg => pg.genres.name).join(', ')}
                </div>
              )}
              
              {project.logline && (
                <p style={{ margin: '8px 0 16px 0', fontSize: '16px', color: '#6b7280' }}>{project.logline}</p>
              )}
              
              {project.tags && project.tags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {project.tags.map((tag, index) => (
                      <span key={index} style={tagStyle}>
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Notes</div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#111827', 
                    lineHeight: '1.5', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}>
                    {renderNotesWithLinks(project.notes)}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                {project.status && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{project.status}</div>
                  </div>
                )}
                {project.stage && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Stage</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{project.stage}</div>
                  </div>
                )}
                {project.project_budget_ranges && project.project_budget_ranges.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Budget</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>
                      {project.project_budget_ranges.map(pbr => pbr.budget_ranges.label).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="detail-page-edit-button" style={{ marginLeft: '24px' }}>
              <Link
                href={`/projects/${project.id}/edit`}
                style={{
                  ...primaryButtonStyle,
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Edit
              </Link>
            </div>
          </div>
          
          {/* Date in bottom left corner */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', fontSize: '12px', color: '#9ca3af' }}>
            Date Added {new Date(project.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Submissions Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Submissions</h2>
            <button
              onClick={() => setShowSubmissionForm(!showSubmissionForm)}
              style={primaryButtonStyle}
            >
              Add Submission
            </button>
          </div>

          {/* New Submission Form */}
          {showSubmissionForm && (
            <form onSubmit={handleSubmissionSubmit} style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Contact</label>
                <select
                  value={newSubmission.contact_id}
                  onChange={(e) => setNewSubmission(prev => ({ ...prev, contact_id: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">Select a contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.companies?.name && ` (${contact.companies.name})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Status</label>
                <select
                  value={newSubmission.status}
                  onChange={(e) => setNewSubmission(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">Select status</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Notes</label>
                <textarea
                  value={newSubmission.notes}
                  onChange={(e) => setNewSubmission(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmissionForm(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={primaryButtonStyle}
                >
                  Add Submission
                </button>
              </div>
            </form>
          )}

          {/* Submissions List */}
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: 0 }}>No submissions yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submissions.map((submission) => (
                <div 
                  key={submission.id}
                  style={{ 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  {editingSubmission === submission.id ? (
                    /* Edit Form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                          <Link
                            href={`/contacts/${submission.contact_id}`}
                            style={{ color: '#3b82f6', textDecoration: 'none' }}
                          >
                            {submission.contacts.first_name} {submission.contacts.last_name}
                          </Link>
                        </div>
                        {submission.contacts.companies?.name && (
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {submission.contacts.companies.name}
                          </div>
                        )}
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {new Date(submission.submitted_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                            Status
                          </label>
                          <select
                            value={editSubmissionData.status}
                            onChange={(e) => setEditSubmissionData(prev => ({ ...prev, status: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                          >
                            <option value="">Select status</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Withdrawn">Withdrawn</option>
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                            Notes
                          </label>
                          <input
                            type="text"
                            value={editSubmissionData.notes}
                            onChange={(e) => setEditSubmissionData(prev => ({ ...prev, notes: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                            placeholder="Notes about this submission..."
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          onClick={cancelEditSubmission}
                          style={secondaryButtonStyle}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditSubmissionSubmit(submission.id)}
                          style={primaryButtonStyle}
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                            <Link
                              href={`/contacts/${submission.contact_id}`}
                              style={{ color: '#3b82f6', textDecoration: 'none' }}
                            >
                              {submission.contacts.first_name} {submission.contacts.last_name}
                            </Link>
                          </div>
                          {submission.contacts.companies?.name && (
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              {submission.contacts.companies.name}
                            </div>
                          )}
                          <span style={statusBadgeStyle(submission.status)}>
                            {submission.status || 'No Status'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
                          <div>Submitted: {new Date(submission.submitted_at).toLocaleDateString('en-GB')}</div>
                          {submission.notes && (
                            <div className="desktop-only">Notes: {submission.notes}</div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <button
                          onClick={() => startEditingSubmission(submission)}
                          style={{ ...secondaryButtonStyle, fontSize: '12px', padding: '6px 12px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSubmission(submission.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          className="desktop-only"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Talking Points Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Add to Talking Points
          </h2>
          
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
              Add this project as a talking point for specific contacts. It will appear in their contact page for easy reference before meetings.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Select Contact
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Choose a contact...</option>
                  {contacts
                    .filter(contact => !talkingPoints.some(tp => tp.contact_id === contact.id))
                    .map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.companies?.name && ` (${contact.companies.name})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={addTalkingPoint}
                disabled={!selectedContact}
                style={{
                  ...primaryButtonStyle,
                  opacity: !selectedContact ? '0.5' : '1',
                  cursor: !selectedContact ? 'not-allowed' : 'pointer'
                }}
              >
                Add Talking Point
              </button>
            </div>
          </div>

          {/* Current Talking Points */}
          {talkingPoints.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                Current Talking Points ({talkingPoints.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {talkingPoints.map((talkingPoint) => (
                  <div
                    key={talkingPoint.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '12px',
                      background: '#f9fafb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        <Link
                          href={`/contacts/${talkingPoint.contact_id}`}
                          style={{ color: '#3b82f6', textDecoration: 'none' }}
                        >
                          {talkingPoint.contacts.first_name} {talkingPoint.contacts.last_name}
                        </Link>
                      </div>
                      {talkingPoint.contacts.companies?.name && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>
                          {talkingPoint.contacts.companies.name}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Added on {new Date(talkingPoint.created_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                    <button
                      onClick={() => removeTalkingPoint(talkingPoint.contact_id)}
                      style={{
                        padding: '4px 8px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}