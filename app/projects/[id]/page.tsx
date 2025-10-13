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

type ProjectAttachment = {
  id: string
  production_company_contact_id: string | null
  sales_agent: string | null
  financier: string | null
  distributor: string | null
  production_company_contact?: {
    first_name: string
    last_name: string | null
    companies: {
      name: string
    } | null
  }
}

type ProjectProducer = {
  id: string
  contact_id: string
  contacts: {
    first_name: string
    last_name: string | null
  }
}

type ProjectCast = {
  id: string
  name: string
  role: string | null
}

type ProjectCrew = {
  id: string
  name: string
  role: string | null
}

type Task = {
  id: string
  heading: string
  description: string | null
  target_date: string | null
  priority: number
  status: 'Outstanding' | 'In Process' | 'Completed'
  contacts?: { first_name: string; last_name: string | null } | null
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
  const [tasks, setTasks] = useState<Task[]>([])
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
  const [showAttachments, setShowAttachments] = useState(false)
  const [attachments, setAttachments] = useState<ProjectAttachment | null>(null)
  const [producers, setProducers] = useState<ProjectProducer[]>([])
  const [cast, setCast] = useState<ProjectCast[]>([])
  const [crew, setCrew] = useState<ProjectCrew[]>([])
  const [filteredProductionCompanies, setFilteredProductionCompanies] = useState<Contact[]>([])
  const [filteredProducerContacts, setFilteredProducerContacts] = useState<Contact[]>([])
  const [productionCompanySearch, setProductionCompanySearch] = useState('')
  const [producerSearch, setProducerSearch] = useState('')
  const [newCastName, setNewCastName] = useState('')
  const [newCastRole, setNewCastRole] = useState('')
  const [newCrewName, setNewCrewName] = useState('')
  const [newCrewRole, setNewCrewRole] = useState('')

  useEffect(() => {
    if (activeWorkspaceId && params.id) {
      loadProject()
      loadSubmissions()
      loadContacts()
      loadTalkingPoints()
      loadTasks()
      loadAttachments()
      loadProducers()
      loadCast()
      loadCrew()
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

  const loadTasks = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        contacts(first_name, last_name)
      `)
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('priority')
      .order('target_date')

    if (error) {
      console.error('Error loading tasks:', error)
    } else {
      setTasks((data as unknown as Task[]) || [])
    }
  }

  const loadAttachments = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('project_attachments')
      .select(`
        *,
        production_company_contact:production_company_contact_id (
          first_name,
          last_name,
          companies:company_id (
            name
          )
        )
      `)
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading attachments:', error)
    } else {
      setAttachments(data)
    }
  }

  const loadProducers = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('project_producers')
      .select(`
        *,
        contacts:contact_id (
          first_name,
          last_name
        )
      `)
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at')

    if (error) {
      console.error('Error loading producers:', error)
    } else {
      setProducers((data as unknown as ProjectProducer[]) || [])
    }
  }

  const loadCast = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('project_cast')
      .select('*')
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at')

    if (error) {
      console.error('Error loading cast:', error)
    } else {
      setCast(data || [])
    }
  }

  const loadCrew = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('project_crew')
      .select('*')
      .eq('project_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at')

    if (error) {
      console.error('Error loading crew:', error)
    } else {
      setCrew(data || [])
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

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      loadTasks()
    } catch (error: any) {
      console.error('Error updating task status:', error)
      alert('Error updating task status: ' + error.message)
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

  // Auto-suggest functionality
  const handleProductionCompanySearch = (value: string) => {
    setProductionCompanySearch(value)
    if (value.length >= 1) {
      const filtered = contacts.filter(contact =>
        contact.companies?.name?.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredProductionCompanies(filtered.slice(0, 10))
    } else {
      setFilteredProductionCompanies([])
    }
  }

  const handleProducerSearch = (value: string) => {
    setProducerSearch(value)
    if (value.length >= 1) {
      const filtered = contacts.filter(contact =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(value.toLowerCase()) ||
        contact.companies?.name?.toLowerCase().includes(value.toLowerCase())
      ).filter(contact => !producers.some(p => p.contact_id === contact.id))
      setFilteredProducerContacts(filtered.slice(0, 10))
    } else {
      setFilteredProducerContacts([])
    }
  }

  // Attachment management functions
  const saveAttachments = async (data: Partial<ProjectAttachment>) => {
    if (!activeWorkspaceId || !params.id) return

    try {
      if (attachments) {
        // Update existing
        const { error } = await supabase
          .from('project_attachments')
          .update(data)
          .eq('project_id', params.id)
          .eq('workspace_id', activeWorkspaceId)
        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('project_attachments')
          .insert([{
            ...data,
            project_id: params.id as string,
            workspace_id: activeWorkspaceId
          }])
        if (error) throw error
      }
      loadAttachments()
    } catch (error: any) {
      console.error('Error saving attachments:', error)
      alert('Error saving attachments: ' + error.message)
    }
  }

  const addProducer = async (contactId: string) => {
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('project_producers')
        .insert([{
          project_id: params.id as string,
          workspace_id: activeWorkspaceId,
          contact_id: contactId
        }])
      if (error) throw error
      setProducerSearch('')
      setFilteredProducerContacts([])
      loadProducers()
    } catch (error: any) {
      console.error('Error adding producer:', error)
      alert('Error adding producer: ' + error.message)
    }
  }

  const removeProducer = async (producerId: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('project_producers')
        .delete()
        .eq('id', producerId)
        .eq('workspace_id', activeWorkspaceId)
      if (error) throw error
      loadProducers()
    } catch (error: any) {
      console.error('Error removing producer:', error)
      alert('Error removing producer: ' + error.message)
    }
  }

  const addCast = async (name: string, role: string) => {
    if (!activeWorkspaceId || !params.id || !name.trim()) return

    try {
      const { error } = await supabase
        .from('project_cast')
        .insert([{
          project_id: params.id as string,
          workspace_id: activeWorkspaceId,
          name: name.trim(),
          role: role.trim() || null
        }])
      if (error) throw error
      setNewCastName('')
      setNewCastRole('')
      loadCast()
    } catch (error: any) {
      console.error('Error adding cast member:', error)
      alert('Error adding cast member: ' + error.message)
    }
  }

  const removeCast = async (castId: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('project_cast')
        .delete()
        .eq('id', castId)
        .eq('workspace_id', activeWorkspaceId)
      if (error) throw error
      loadCast()
    } catch (error: any) {
      console.error('Error removing cast member:', error)
      alert('Error removing cast member: ' + error.message)
    }
  }

  const addCrew = async (name: string, role: string) => {
    if (!activeWorkspaceId || !params.id || !name.trim()) return

    try {
      const { error } = await supabase
        .from('project_crew')
        .insert([{
          project_id: params.id as string,
          workspace_id: activeWorkspaceId,
          name: name.trim(),
          role: role.trim() || null
        }])
      if (error) throw error
      setNewCrewName('')
      setNewCrewRole('')
      loadCrew()
    } catch (error: any) {
      console.error('Error adding crew member:', error)
      alert('Error adding crew member: ' + error.message)
    }
  }

  const removeCrew = async (crewId: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('project_crew')
        .delete()
        .eq('id', crewId)
        .eq('workspace_id', activeWorkspaceId)
      if (error) throw error
      loadCrew()
    } catch (error: any) {
      console.error('Error removing crew member:', error)
      alert('Error removing crew member: ' + error.message)
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
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', paddingBottom: '32px' }}>
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
          <div style={{ position: 'absolute', bottom: '8px', left: '16px', fontSize: '12px', color: '#9ca3af' }}>
            Date Added {new Date(project.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Tasks Section - Only show if tasks exist */}
        {tasks.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>Tasks</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    background: task.status === 'Completed' ? '#f9fafb' : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '500',
                          color: task.status === 'Completed' ? '#6b7280' : '#111827',
                          textDecoration: task.status === 'Completed' ? 'line-through' : 'none'
                        }}>
                          {task.heading}
                        </div>
                      </div>

                      {task.description && (
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          {task.description.length > 150 ? task.description.substring(0, 150) + '...' : task.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                        {task.target_date && (
                          <div><strong>Target Date:</strong> {new Date(task.target_date).toLocaleDateString('en-GB')}</div>
                        )}
                        {task.contacts && (
                          <div>👤 {task.contacts.first_name} {task.contacts.last_name || ''}</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Outstanding">Outstanding</option>
                          <option value="In Process">In Process</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <Link
                          href={`/tasks/${task.id}/edit`}
                          style={{
                            ...secondaryButtonStyle,
                            fontSize: '12px',
                            padding: '6px 12px'
                          }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Attachments Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}
            onClick={() => setShowAttachments(!showAttachments)}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Attachments</h2>
            <span style={{ fontSize: '16px', color: '#6b7280', transition: 'transform 0.2s' }}>
              {showAttachments ? '▲' : '▼'}
            </span>
          </div>

          {showAttachments && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Production Company Field */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Production Company
                </label>
                <input
                  type="text"
                  value={productionCompanySearch}
                  onChange={(e) => handleProductionCompanySearch(e.target.value)}
                  placeholder="Start typing to search production companies..."
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                {filteredProductionCompanies.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}>
                    {filteredProductionCompanies.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setProductionCompanySearch(contact.companies?.name || `${contact.first_name} ${contact.last_name}`)
                          setFilteredProductionCompanies([])
                          saveAttachments({ production_company_contact_id: contact.id })
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {contact.companies?.name || `${contact.first_name} ${contact.last_name}`}
                        </div>
                        {contact.companies?.name && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {contact.first_name} {contact.last_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {attachments?.production_company_contact && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                    <strong>Selected:</strong> {attachments.production_company_contact.companies?.name || `${attachments.production_company_contact.first_name} ${attachments.production_company_contact.last_name}`}
                    <button
                      onClick={() => {
                        setProductionCompanySearch('')
                        saveAttachments({ production_company_contact_id: null })
                      }}
                      style={{ marginLeft: '8px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Producer Field with Multiple Support */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Producer
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={producerSearch}
                    onChange={(e) => handleProducerSearch(e.target.value)}
                    placeholder="Start typing to search producers..."
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {filteredProducerContacts.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                    marginTop: '-1px'
                  }}>
                    {filteredProducerContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => {
                          addProducer(contact.id)
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.companies?.name && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {contact.companies.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {producers.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Selected Producers:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {producers.map((producer) => (
                        <div key={producer.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '6px 12px', 
                          background: '#f9fafb', 
                          borderRadius: '6px', 
                          fontSize: '14px' 
                        }}>
                          <span>{producer.contacts.first_name} {producer.contacts.last_name}</span>
                          <button
                            onClick={() => removeProducer(producer.id)}
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sales Agent, Financier, Distributor Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Sales Agent
                  </label>
                  <input
                    type="text"
                    value={attachments?.sales_agent || ''}
                    onChange={(e) => saveAttachments({ sales_agent: e.target.value })}
                    placeholder="Sales agent name or company..."
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Financier
                  </label>
                  <input
                    type="text"
                    value={attachments?.financier || ''}
                    onChange={(e) => saveAttachments({ financier: e.target.value })}
                    placeholder="Financier name or company..."
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Distributor
                  </label>
                  <input
                    type="text"
                    value={attachments?.distributor || ''}
                    onChange={(e) => saveAttachments({ distributor: e.target.value })}
                    placeholder="Distributor name or company..."
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

              {/* Cast Field with Role */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Cast
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={newCastName}
                    onChange={(e) => setNewCastName(e.target.value)}
                    placeholder="Actor name..."
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    value={newCastRole}
                    onChange={(e) => setNewCastRole(e.target.value)}
                    placeholder="Character name..."
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCast(newCastName, newCastRole)
                      }
                    }}
                  />
                  <button
                    onClick={() => addCast(newCastName, newCastRole)}
                    disabled={!newCastName.trim()}
                    style={{
                      padding: '8px 12px',
                      background: newCastName.trim() ? '#3b82f6' : '#d1d5db',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: newCastName.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '500'
                    }}
                  >
                    +
                  </button>
                </div>
                {cast.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Cast Members:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {cast.map((castMember) => (
                        <div key={castMember.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '6px 12px', 
                          background: '#f9fafb', 
                          borderRadius: '6px', 
                          fontSize: '14px' 
                        }}>
                          <span>
                            <strong>{castMember.name}</strong>
                            {castMember.role && <span style={{ color: '#6b7280' }}> as {castMember.role}</span>}
                          </span>
                          <button
                            onClick={() => removeCast(castMember.id)}
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Crew Field with Role */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Crew
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={newCrewName}
                    onChange={(e) => setNewCrewName(e.target.value)}
                    placeholder="Crew member name..."
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    value={newCrewRole}
                    onChange={(e) => setNewCrewRole(e.target.value)}
                    placeholder="Role (e.g. Director, DP, Editor)..."
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCrew(newCrewName, newCrewRole)
                      }
                    }}
                  />
                  <button
                    onClick={() => addCrew(newCrewName, newCrewRole)}
                    disabled={!newCrewName.trim()}
                    style={{
                      padding: '8px 12px',
                      background: newCrewName.trim() ? '#3b82f6' : '#d1d5db',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: newCrewName.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '500'
                    }}
                  >
                    +
                  </button>
                </div>
                {crew.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Crew Members:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {crew.map((crewMember) => (
                        <div key={crewMember.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '6px 12px', 
                          background: '#f9fafb', 
                          borderRadius: '6px', 
                          fontSize: '14px' 
                        }}>
                          <span>
                            <strong>{crewMember.name}</strong>
                            {crewMember.role && <span style={{ color: '#6b7280' }}> - {crewMember.role}</span>}
                          </span>
                          <button
                            onClick={() => removeCrew(crewMember.id)}
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
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
          )}
        </div>
      </div>
    </Layout>
  )
}