'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Submission = {
  id: string
  project_id: string
  contact_id: string
  status: string | null
  submitted_at: string
  notes: string | null
  feedback: string | null
  projects: {
    title: string
  }
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

const activeFilterStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
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

export default function SubmissionsPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (activeWorkspaceId) {
      loadSubmissions()
    }
  }, [activeWorkspaceId])

  const loadSubmissions = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        projects:project_id (
          title
        ),
        contacts:contact_id (
          first_name,
          last_name,
          companies:company_id (
            name
          )
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading submissions:', error)
    } else {
      setSubmissions(data || [])
    }
    setLoading(false)
  }

  const filteredSubmissions = submissions.filter(submission => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = (
      submission.projects.title.toLowerCase().includes(search) ||
      submission.contacts.first_name.toLowerCase().includes(search) ||
      submission.contacts.last_name?.toLowerCase().includes(search) ||
      submission.contacts.companies?.name?.toLowerCase().includes(search) ||
      submission.notes?.toLowerCase().includes(search) ||
      submission.feedback?.toLowerCase().includes(search)
    )
    
    const matchesStatus = !statusFilter || submission.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    'Submitted',
    'Under Review',
    'Shortlisted',
    'Accepted',
    'Rejected',
    'Withdrawn'
  ]

  const statusCounts = statusOptions.reduce((acc, status) => {
    acc[status] = submissions.filter(s => s.status === status).length
    return acc
  }, {} as Record<string, number>)

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
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Submissions</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Track all project submissions across your workspace.
          </p>
        </div>

        {/* Filters */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Search Submissions
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project, contact, company, or notes..."
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
                Filter by Status
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => setStatusFilter('')}
                  style={statusFilter === '' ? activeFilterStyle : buttonStyle}
                >
                  All ({submissions.length})
                </button>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    style={statusFilter === status ? activeFilterStyle : buttonStyle}
                  >
                    {status} ({statusCounts[status] || 0})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
              {submissions.length === 0 ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>No submissions yet.</p>
                  <p style={{ fontSize: '14px', margin: 0 }}>
                    Submissions are created from individual{' '}
                    <Link href="/projects" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      project pages
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0 }}>No submissions match your filters.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1px', background: '#e5e7eb' }}>
              {/* Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 2fr', 
                gap: '16px', 
                padding: '16px 24px', 
                background: '#f9fafb',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div>Project</div>
                <div>Contact</div>
                <div>Company</div>
                <div>Status</div>
                <div>Submitted</div>
                <div>Notes</div>
              </div>

              {/* Rows */}
              {filteredSubmissions.map((submission) => (
                <div 
                  key={submission.id} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 2fr', 
                    gap: '16px', 
                    padding: '16px 24px', 
                    background: '#ffffff',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <div>
                    <Link
                      href={`/projects/${submission.project_id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
                    >
                      {submission.projects.title}
                    </Link>
                  </div>
                  <div>
                    <Link
                      href={`/contacts/${submission.contact_id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
                    >
                      {submission.contacts.first_name} {submission.contacts.last_name}
                    </Link>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {submission.contacts.companies?.name || '—'}
                  </div>
                  <div>
                    <span style={statusBadgeStyle(submission.status)}>
                      {submission.status || 'No Status'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {new Date(submission.submitted_at).toLocaleDateString('en-GB')}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {submission.notes || submission.feedback || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {submissions.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{submissions.length}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total</div>
              </div>
              {statusOptions.map((status) => {
                const count = statusCounts[status] || 0
                return (
                  <div key={status} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{count}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{status}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}