'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  remit_notes: string | null
  taste_notes: string | null
  additional_notes: string | null
  tags: string[] | null
  companies: {
    name: string
  } | null
}

type Meeting = {
  id: string
  meeting_type: string | null
  meeting_link: string | null
  scheduled_at: string | null
  follow_up_due: string | null
  notes: string | null
}

type Submission = {
  id: string
  project_id: string
  status: string | null
  submitted_at: string
  notes: string | null
  feedback: string | null
  projects: {
    title: string
  }
}

type Project = {
  id: string
  title: string
  logline: string | null
  status: string | null
  stage: string | null
  tags: string[] | null
  project_mediums: { mediums: { id: number, name: string } }[]
  project_genres: { genres: { id: number, name: string } }[]
  project_budget_ranges: { budget_ranges: { id: number, label: string } }[]
  match_score?: number
  match_reasons?: string[]
}

type TalkingPoint = {
  id: string
  project_id: string
  created_at: string
  projects: {
    title: string
    logline: string | null
    status: string | null
    stage: string | null
  }
}

type NewsArticle = {
  id: string
  title: string
  summary: string
  url: string
  published_at: string
  source: string
  author: string | null
  match_type: string
  match_confidence: number
  matched_text: string
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

const meetingBadgeStyle = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '500',
  background: '#dbeafe',
  color: '#2563eb',
  display: 'inline-block',
}

// Helper function to get source badge style
const getSourceBadgeStyle = (source: string) => {
  const baseStyle = {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'uppercase' as const
  }
  
  switch (source) {
    case 'variety':
      return { ...baseStyle, background: '#fee2e2', color: '#dc2626' }
    case 'deadline':
      return { ...baseStyle, background: '#dbeafe', color: '#2563eb' }
    case 'screendaily':
      return { ...baseStyle, background: '#d1fae5', color: '#059669' }
    default:
      return { ...baseStyle, background: '#f3f4f6', color: '#6b7280' }
  }
}

// Helper function to get confidence badge style
const getConfidenceBadgeStyle = (confidence: number) => {
  const baseStyle = {
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '500',
    display: 'inline-block'
  }
  
  if (confidence >= 0.8) {
    return { ...baseStyle, background: '#dcfce7', color: '#166534' }
  } else if (confidence >= 0.6) {
    return { ...baseStyle, background: '#fef3c7', color: '#d97706' }
  } else {
    return { ...baseStyle, background: '#f3f4f6', color: '#6b7280' }
  }
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Helper function to format relative time
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-GB')
    }
  }
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeWorkspaceId } = useWorkspace()
  const [contact, setContact] = useState<Contact | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    meeting_type: '',
    meeting_link: '',
    date: '',
    time: '',
    notes: ''
  })
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null)
  const [editMeetingData, setEditMeetingData] = useState({
    meeting_type: '',
    meeting_link: '',
    date: '',
    time: '',
    notes: ''
  })
  const [potentialMatches, setPotentialMatches] = useState<Project[]>([])
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([])
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [loadingNews, setLoadingNews] = useState(false)

  useEffect(() => {
    if (activeWorkspaceId && params.id) {
      loadContact()
      loadMeetings()
      loadSubmissions()
      loadTalkingPoints()
      loadNewsArticles()
    }
  }, [activeWorkspaceId, params.id])

  useEffect(() => {
    if (contact) {
      findPotentialMatches()
    }
  }, [contact, activeWorkspaceId])

  const loadContact = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies:company_id (
          name
        ),
        contact_mediums (
          mediums (
            id,
            name
          )
        ),
        contact_genres (
          genres (
            id,
            name
          )
        ),
        contact_budget_ranges (
          budget_ranges (
            id,
            label
          )
        )
      `)
      .eq('id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .single()

    if (error) {
      console.error('Error loading contact:', error)
      router.push('/contacts')
    } else {
      setContact(data)
    }
  }

  const loadMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('contact_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('scheduled_at', { ascending: false })

    if (error) {
      console.error('Error loading meetings:', error)
    } else {
      setMeetings(data || [])
    }
  }

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        projects:project_id (
          title
        )
      `)
      .eq('contact_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading submissions:', error)
    } else {
      setSubmissions(data || [])
    }
    setLoading(false)
  }

  const loadTalkingPoints = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('contact_talking_points')
      .select(`
        *,
        projects:project_id (
          title,
          logline,
          status,
          stage
        )
      `)
      .eq('contact_id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading talking points:', error)
    } else {
      setTalkingPoints(data || [])
    }
  }

  const loadNewsArticles = async () => {
    if (!activeWorkspaceId || !params.id) return

    setLoadingNews(true)
    try {
      console.log('🔍 Loading news articles for contact:', params.id)
      
      // Calculate date 2 months ago for article retention
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
      const twoMonthsAgoISO = twoMonthsAgo.toISOString()
      
      console.log('📅 Filtering articles newer than:', twoMonthsAgoISO)

      // Get news articles that match this contact (within last 2 months)
      // First get matches, then fetch articles separately to avoid ordering issues
      const { data: matches, error: matchError } = await supabase
        .from('news_contact_matches')
        .select(`
          news_article_id,
          match_type,
          match_confidence,
          matched_text
        `)
        .eq('contact_id', params.id)

      console.log('🔗 Contact matches found:', { 
        matches, 
        matchError, 
        count: matches?.length, 
        contactId: params.id,
        matchDetails: matches?.map(m => ({ 
          articleId: m.news_article_id, 
          matchType: m.match_type,
          confidence: m.match_confidence,
          text: m.matched_text
        }))
      })

      if (matchError || !matches || matches.length === 0) {
        console.log('📰 No matches found for contact ID:', params.id)
        setNewsArticles([])
        return
      }

      // Get the articles for these matches
      const articleIds = matches.map(match => match.news_article_id)
      
      const { data: articlesData, error } = await supabase
        .from('news_articles')
        .select('id, title, summary, url, published_at, source, author')
        .in('id', articleIds)
        .gte('published_at', twoMonthsAgoISO)
        .order('published_at', { ascending: false })
        .limit(10)

      console.log('📰 Articles query result:', { articlesData, error })

      if (error) {
        console.error('❌ Error loading news articles:', error)
        return
      }

      if (!articlesData || articlesData.length === 0) {
        console.log('📰 No recent news articles found for contact (within 2 months)')
        setNewsArticles([])
        return
      }

      // Combine articles with their match data
      const articlesWithMatches = articlesData.map(article => {
        const match = matches.find(m => m.news_article_id === article.id)
        return {
          id: article.id,
          title: article.title,
          summary: article.summary,
          url: article.url,
          published_at: article.published_at,
          source: article.source,
          author: article.author,
          match_type: match?.match_type || 'unknown',
          match_confidence: match?.match_confidence || 0,
          matched_text: match?.matched_text || ''
        }
      })

      console.log('✅ Found', articlesWithMatches.length, 'articles for contact')
      setNewsArticles(articlesWithMatches)
    } catch (error) {
      console.error('❌ Error loading news articles:', error)
    } finally {
      setLoadingNews(false)
    }
  }

  const addTalkingPoint = async (projectId: string) => {
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('contact_talking_points')
        .insert([{
          workspace_id: activeWorkspaceId,
          contact_id: params.id as string,
          project_id: projectId
        }])

      if (error) throw error
      
      // Reload talking points
      loadTalkingPoints()
    } catch (error: any) {
      console.error('Error adding talking point:', error)
      alert('Error adding talking point: ' + error.message)
    }
  }

  const removeTalkingPoint = async (projectId: string) => {
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('contact_talking_points')
        .delete()
        .eq('contact_id', params.id)
        .eq('project_id', projectId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error
      
      // Reload talking points
      loadTalkingPoints()
    } catch (error: any) {
      console.error('Error removing talking point:', error)
      alert('Error removing talking point: ' + error.message)
    }
  }

  const isInTalkingPoints = (projectId: string) => {
    return talkingPoints.some(tp => tp.project_id === projectId)
  }

  // Helper function to generate time options (15-minute intervals, 24 hours)
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
        times.push({ value: timeString, display: displayTime })
      }
    }
    return times
  }

  // Helper function to combine date and time into ISO string
  const combineDateAndTime = (date: string, time: string) => {
    if (!date || !time) return null
    return `${date}T${time}:00`
  }

  // Helper function to split ISO datetime into date and time
  const splitDateTime = (dateTime: string | null) => {
    if (!dateTime) return { date: '', time: '' }
    const dt = new Date(dateTime)
    const date = dt.toISOString().split('T')[0]
    const time = dt.toTimeString().slice(0, 5)
    return { date, time }
  }

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !params.id) return

    try {
      const { error } = await supabase
        .from('meetings')
        .insert([{
          workspace_id: activeWorkspaceId,
          contact_id: params.id as string,
          meeting_type: newMeeting.meeting_type || null,
          meeting_link: newMeeting.meeting_link || null,
          scheduled_at: combineDateAndTime(newMeeting.date, newMeeting.time),
          notes: newMeeting.notes || null
        }])

      if (error) throw error

      setNewMeeting({ meeting_type: '', meeting_link: '', date: '', time: '', notes: '' })
      setShowMeetingForm(false)
      loadMeetings()
    } catch (error: any) {
      console.error('Error creating meeting:', error)
      alert('Error creating meeting: ' + error.message)
    }
  }

  const startEditingMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting.id)
    const { date, time } = splitDateTime(meeting.scheduled_at)
    setEditMeetingData({
      meeting_type: meeting.meeting_type || '',
      meeting_link: meeting.meeting_link || '',
      date,
      time,
      notes: meeting.notes || ''
    })
  }

  const cancelEditMeeting = () => {
    setEditingMeeting(null)
    setEditMeetingData({ meeting_type: '', meeting_link: '', date: '', time: '', notes: '' })
  }

  const handleEditMeetingSubmit = async (meetingId: string) => {
    if (!activeWorkspaceId) return

    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          meeting_type: editMeetingData.meeting_type || null,
          meeting_link: editMeetingData.meeting_link || null,
          scheduled_at: combineDateAndTime(editMeetingData.date, editMeetingData.time),
          notes: editMeetingData.notes || null
        })
        .eq('id', meetingId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      setEditingMeeting(null)
      setEditMeetingData({ meeting_type: '', meeting_link: '', date: '', time: '', notes: '' })
      loadMeetings()
    } catch (error: any) {
      console.error('Error updating meeting:', error)
      alert('Error updating meeting: ' + error.message)
    }
  }

  const deleteMeeting = async (meetingId: string) => {
    if (!activeWorkspaceId) return
    if (!confirm('Are you sure you want to delete this meeting?')) return

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error
      loadMeetings()
    } catch (error: any) {
      console.error('Error deleting meeting:', error)
      alert('Error deleting meeting: ' + error.message)
    }
  }

  const findPotentialMatches = async () => {
    if (!activeWorkspaceId || !contact) {
      setPotentialMatches([])
      return
    }

    // Get contact's attributes for matching
    const contactMediumIds = contact.contact_mediums?.map(cm => cm.mediums.id) || []
    const contactGenreIds = contact.contact_genres?.map(cg => cg.genres.id) || []
    const contactBudgetIds = contact.contact_budget_ranges?.map(cbr => cbr.budget_ranges.id) || []
    const contactTags = contact.tags?.map(tag => tag.toLowerCase().replace('#', '')) || []

    if (contactMediumIds.length === 0 && contactGenreIds.length === 0 && contactBudgetIds.length === 0 && contactTags.length === 0) {
      setPotentialMatches([])
      return
    }

    try {
      // Get all projects with their relationships
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          logline,
          status,
          stage,
          tags,
          project_mediums (
            mediums (
              id,
              name
            )
          ),
          project_genres (
            genres (
              id,
              name
            )
          ),
          project_budget_ranges (
            budget_ranges (
              id,
              label
            )
          )
        `)
        .eq('workspace_id', activeWorkspaceId)

      if (error) {
        console.error('Error loading projects for matching:', error)
        return
      }

      // Calculate match scores
      const matchedProjects = projects
        ?.map((project: any) => {
          let score = 0
          const reasons: string[] = []

          // Check medium matches
          const projectMediumIds = project.project_mediums?.map((pm: any) => pm.mediums.id) || []
          const mediumMatches = contactMediumIds.filter(id => projectMediumIds.includes(id))
          if (mediumMatches.length > 0) {
            score += mediumMatches.length * 3
            const mediumNames = project.project_mediums
              ?.filter((pm: any) => contactMediumIds.includes(pm.mediums.id))
              .map((pm: any) => pm.mediums.name)
            reasons.push(`Matches your ${mediumNames.join(', ')} expertise`)
          }

          // Check genre matches
          const projectGenreIds = project.project_genres?.map((pg: any) => pg.genres.id) || []
          const genreMatches = contactGenreIds.filter(id => projectGenreIds.includes(id))
          if (genreMatches.length > 0) {
            score += genreMatches.length * 2
            const genreNames = project.project_genres
              ?.filter((pg: any) => contactGenreIds.includes(pg.genres.id))
              .map((pg: any) => pg.genres.name)
            reasons.push(`${genreNames.join(', ')} genre matches your interests`)
          }

          // Check budget range matches
          const projectBudgetIds = project.project_budget_ranges?.map((pbr: any) => pbr.budget_ranges.id) || []
          const budgetMatches = contactBudgetIds.filter(id => projectBudgetIds.includes(id))
          if (budgetMatches.length > 0) {
            score += budgetMatches.length * 2
            reasons.push(`Budget range matches your experience`)
          }

          // Check tag matches
          if (project.tags && contactTags.length > 0) {
            const projectTags = project.tags.map((tag: string) => tag.toLowerCase().replace('#', ''))
            const tagMatches = contactTags.filter(tag => projectTags.includes(tag))
            if (tagMatches.length > 0) {
              score += tagMatches.length
              reasons.push(`Shares tags: ${tagMatches.map(tag => `#${tag}`).join(', ')}`)
            }
          }

          return {
            ...project,
            match_score: score,
            match_reasons: reasons
          }
        })
        .filter((project: any) => project.match_score > 0)
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 5) || [] // Limit to 5 as requested

      setPotentialMatches(matchedProjects)
    } catch (error) {
      console.error('Error finding potential matches:', error)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>Loading...</div>
      </Layout>
    )
  }

  if (!contact) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          <p style={{ margin: '0 0 16px 0' }}>Contact not found</p>
          <Link href="/contacts" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Back to Contacts
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Contact Header */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px 0' }}>
                {contact.first_name} {contact.last_name}
              </h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {contact.companies?.name && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Company</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{contact.companies.name}</div>
                  </div>
                )}
                {contact.role && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Role</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{contact.role}</div>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '14px' }}>
                      <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                    <div style={{ fontSize: '14px' }}>
                      <a href={`tel:${contact.phone}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {contact.tags && contact.tags.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {contact.tags.map((tag, index) => (
                      <span key={index} style={tagStyle}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contact.contact_mediums && contact.contact_mediums.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Mediums</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {contact.contact_mediums.map((cm: any, index: number) => (
                      <span key={index} style={tagStyle}>
                        {cm.mediums.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contact.contact_genres && contact.contact_genres.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Genres</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {contact.contact_genres.map((cg: any, index: number) => (
                      <span key={index} style={tagStyle}>
                        {cg.genres.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contact.contact_budget_ranges && contact.contact_budget_ranges.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Budget Ranges</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {contact.contact_budget_ranges.map((cbr: any, index: number) => (
                      <span key={index} style={tagStyle}>
                        {cbr.budget_ranges.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {contact.remit_notes && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Remit Notes</div>
                  <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{contact.remit_notes}</div>
                </div>
              )}

              {contact.taste_notes && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Taste Notes</div>
                  <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{contact.taste_notes}</div>
                </div>
              )}

              {contact.additional_notes && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Additional Notes</div>
                  <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{contact.additional_notes}</div>
                </div>
              )}
            </div>
            
            <div style={{ marginLeft: '24px' }}>
              <Link
                href={`/contacts/${contact.id}/edit`}
                style={secondaryButtonStyle}
              >
                Edit Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Market Intelligence Section - Only show if there are matches */}
        {newsArticles.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Market Intelligence
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                Industry news mentioning this contact
              </span>
            </div>
          </div>

          {loadingNews ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: 0 }}>Loading industry news...</p>
            </div>
          ) : newsArticles.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: '0 0 8px 0' }}>No recent industry news found mentioning this contact.</p>
              <p style={{ fontSize: '12px', margin: 0 }}>
                News is automatically gathered from Variety, Deadline, and Screen Daily.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {newsArticles.map((article) => {
                // Decode HTML entities for clean display
                const cleanTitle = article.title
                  .replace(/&#8216;/g, "'")
                  .replace(/&#8217;/g, "'") 
                  .replace(/&#8220;/g, '"')
                  .replace(/&#8221;/g, '"')
                  .replace(/&#8211;/g, '-')
                  .replace(/&#8212;/g, '-')
                  .replace(/&#038;/g, '&')

                const cleanSummary = article.summary
                  ?.replace(/&#8216;/g, "'")
                  .replace(/&#8217;/g, "'") 
                  .replace(/&#8220;/g, '"')
                  .replace(/&#8221;/g, '"')
                  .replace(/&#8211;/g, '-')
                  .replace(/&#8212;/g, '-')
                  .replace(/&#038;/g, '&')

                return (
                  <div
                    key={article.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '16px',
                      background: '#f9fafb',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1, marginRight: '16px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px', lineHeight: '1.4' }}>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#111827', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#111827'}
                          >
                            {cleanTitle}
                          </a>
                        </h3>
                        {cleanSummary && (
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                            {truncateText(cleanSummary, 150)}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <span style={getSourceBadgeStyle(article.source)}>
                          {article.source}
                        </span>
                        <span style={getConfidenceBadgeStyle(article.match_confidence)}>
                          {Math.round(article.match_confidence * 100)}% match
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                        <span>{getRelativeTime(article.published_at)}</span>
                        {article.author && (
                          <span>by {article.author}</span>
                        )}
                        <span style={{ 
                          padding: '2px 6px', 
                          background: '#e5e7eb', 
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          Matched: "{truncateText(article.matched_text, 30)}"
                        </span>
                      </div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 8px',
                          background: '#3b82f6',
                          color: '#ffffff',
                          borderRadius: '4px',
                          fontSize: '11px',
                          textDecoration: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        Read Article
                      </a>
                    </div>
                  </div>
                )
              })}
              
              {newsArticles.length >= 10 && (
                <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#6b7280' }}>
                  Showing 10 most recent articles. More intelligence available as news is published.
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Submissions Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>Submissions to this Contact</h2>
          
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: 0 }}>No submissions to this contact yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1px', background: '#e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1.5fr 1fr 2fr', 
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
                <div>Status</div>
                <div>Submitted</div>
                <div>Notes</div>
              </div>

              {/* Rows */}
              {submissions.map((submission) => (
                <div 
                  key={submission.id}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1.5fr 1fr 2fr', 
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

        {/* Meetings Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Meetings</h2>
            <button
              onClick={() => setShowMeetingForm(!showMeetingForm)}
              style={primaryButtonStyle}
            >
              Add Meeting
            </button>
          </div>

          {/* New Meeting Form */}
          {showMeetingForm && (
            <form onSubmit={handleMeetingSubmit} style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Meeting Type</label>
                  <select
                    value={newMeeting.meeting_type}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, meeting_type: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">Select type</option>
                    <option value="GENERAL">GENERAL</option>
                    <option value="PITCH">PITCH</option>
                    <option value="FOLLOW-UP">FOLLOW-UP</option>
                    <option value="FEEDBACK">FEEDBACK</option>
                    <option value="UPDATE">UPDATE</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Meeting Link</label>
                  <input
                    type="url"
                    value={newMeeting.meeting_link}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, meeting_link: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Date</label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Time</label>
                  <select
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">Select time</option>
                    {generateTimeOptions().map((timeOption) => (
                      <option key={timeOption.value} value={timeOption.value}>
                        {timeOption.display}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Notes</label>
                <textarea
                  value={newMeeting.notes}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                  placeholder="Meeting notes..."
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowMeetingForm(false)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={primaryButtonStyle}
                >
                  Save Meeting
                </button>
              </div>
            </form>
          )}
          
          {meetings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: 0 }}>No meetings with this contact yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {meetings.map((meeting) => {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const isOverdue = meeting.scheduled_at && new Date(meeting.scheduled_at) < now
                const hasFollowUpDue = meeting.follow_up_due && new Date(meeting.follow_up_due) <= today
                
                return (
                  <div 
                    key={meeting.id} 
                    style={{
                      border: `1px solid ${isOverdue ? '#fecaca' : hasFollowUpDue ? '#fed7aa' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      background: isOverdue ? '#fef2f2' : hasFollowUpDue ? '#fff7ed' : '#ffffff',
                    }}
                  >
                    {editingMeeting === meeting.id ? (
                      /* Edit Form */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Meeting Type</label>
                            <select
                              value={editMeetingData.meeting_type}
                              onChange={(e) => setEditMeetingData(prev => ({ ...prev, meeting_type: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                            >
                              <option value="">Select type</option>
                              <option value="GENERAL">GENERAL</option>
                              <option value="PITCH">PITCH</option>
                              <option value="FOLLOW-UP">FOLLOW-UP</option>
                              <option value="FEEDBACK">FEEDBACK</option>
                              <option value="UPDATE">UPDATE</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Meeting Link</label>
                            <input
                              type="url"
                              value={editMeetingData.meeting_link}
                              onChange={(e) => setEditMeetingData(prev => ({ ...prev, meeting_link: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                            />
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Date</label>
                            <input
                              type="date"
                              value={editMeetingData.date}
                              onChange={(e) => setEditMeetingData(prev => ({ ...prev, date: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                            />
                          </div>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Time</label>
                            <select
                              value={editMeetingData.time}
                              onChange={(e) => setEditMeetingData(prev => ({ ...prev, time: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                            >
                              <option value="">Select time</option>
                              {generateTimeOptions().map((timeOption) => (
                                <option key={timeOption.value} value={timeOption.value}>
                                  {timeOption.display}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Notes</label>
                          <textarea
                            value={editMeetingData.notes}
                            onChange={(e) => setEditMeetingData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                            placeholder="Meeting notes..."
                          />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button
                            onClick={cancelEditMeeting}
                            style={secondaryButtonStyle}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditMeetingSubmit(meeting.id)}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {meeting.meeting_type && (
                              <span style={meetingBadgeStyle}>
                                {meeting.meeting_type}
                              </span>
                            )}
                            {meeting.scheduled_at && (
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                {new Date(meeting.scheduled_at).toLocaleDateString('en-GB')} at{' '}
                                {new Date(meeting.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            )}
                            {meeting.meeting_link && (
                              <a
                                href={meeting.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '14px',
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: '#eff6ff',
                                  border: '1px solid #dbeafe'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#dbeafe'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#eff6ff'
                                }}
                              >
                                Join Meeting
                              </a>
                            )}
                            {isOverdue && (
                              <span style={{ 
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                background: '#fef2f2',
                                color: '#dc2626',
                                display: 'inline-block'
                              }}>
                                Overdue
                              </span>
                            )}
                          </div>
                          {meeting.notes && (
                            <p style={{ margin: '8px 0', fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{meeting.notes}</p>
                          )}
                          {meeting.follow_up_due && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: hasFollowUpDue ? '#ea580c' : '#6b7280' }}>
                              Follow-up due: {new Date(meeting.follow_up_due).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                          <button
                            onClick={() => startEditingMeeting(meeting)}
                            style={{ ...secondaryButtonStyle, fontSize: '12px', padding: '6px 12px' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            style={{ 
                              ...secondaryButtonStyle, 
                              fontSize: '12px', 
                              padding: '6px 12px',
                              color: '#dc2626',
                              borderColor: '#dc2626'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Talking Points Section */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Talking Points
          </h2>
          
          {talkingPoints.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
              <p style={{ margin: 0 }}>No talking points yet. Add projects from the "Potential Matches" section below to discuss with this contact.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {talkingPoints.map((talkingPoint) => (
                <div
                  key={talkingPoint.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#f9fafb',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        {talkingPoint.projects.title}
                      </h3>
                      {talkingPoint.projects.logline && (
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                          {talkingPoint.projects.logline}
                        </p>
                      )}
                      {(talkingPoint.projects.status || talkingPoint.projects.stage) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {talkingPoint.projects.status && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#e0f2fe',
                              color: '#0369a1'
                            }}>
                              {talkingPoint.projects.status}
                            </span>
                          )}
                          {talkingPoint.projects.stage && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#f3e8ff',
                              color: '#7c3aed'
                            }}>
                              {talkingPoint.projects.stage}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={`/projects/${talkingPoint.project_id}`}
                        style={{
                          padding: '4px 8px',
                          background: '#3b82f6',
                          color: '#ffffff',
                          borderRadius: '4px',
                          fontSize: '12px',
                          textDecoration: 'none',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => removeTalkingPoint(talkingPoint.project_id)}
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
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Added on {new Date(talkingPoint.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Potential Matches Section */}
        {potentialMatches.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Potential Project Matches
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Based on your mediums, genres, budget ranges, and tags, here are projects that might be a good fit:
            </p>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {potentialMatches.map((project) => (
                <div
                  key={project.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    background: '#f9fafb',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        {project.title}
                      </h3>
                      {project.logline && (
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                          {project.logline}
                        </p>
                      )}
                      {(project.status || project.stage) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          {project.status && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#e0f2fe',
                              color: '#0369a1'
                            }}>
                              {project.status}
                            </span>
                          )}
                          {project.stage && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: '#f3e8ff',
                              color: '#7c3aed'
                            }}>
                              {project.stage}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: '#dcfce7',
                      color: '#166534'
                    }}>
                      {project.match_score} match{project.match_score !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Why this project matches:
                    </p>
                    <ul style={{ fontSize: '14px', color: '#6b7280', margin: 0, paddingLeft: '20px' }}>
                      {project.match_reasons?.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <a
                      href={`/projects/${project.id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '14px',
                        textDecoration: 'none',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      View Project
                    </a>
                    <button
                      onClick={() => {
                        if (isInTalkingPoints(project.id)) {
                          removeTalkingPoint(project.id)
                        } else {
                          addTalkingPoint(project.id)
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        background: isInTalkingPoints(project.id) ? '#f59e0b' : '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {isInTalkingPoints(project.id) ? 'Remove from Talking Points' : 'Add to Talking Points'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}