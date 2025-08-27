'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type AnalyticsData = {
  projectGenres: { name: string; count: number }[]
  contactGenres: { name: string; count: number }[]
  projectMediums: { name: string; count: number }[]
  contactMediums: { name: string; count: number }[]
  projectStatuses: { name: string; count: number }[]
  projectStages: { name: string; count: number }[]
  topTags: { name: string; count: number }[]
  totalProjects: number
  totalContacts: number
  totalSubmissions: number
}

const cardStyle = {
  background: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  padding: '24px'
}

const statCardStyle = {
  background: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  padding: '20px',
  textAlign: 'center' as const
}

export default function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [data, setData] = useState<AnalyticsData>({
    projectGenres: [],
    contactGenres: [],
    projectMediums: [],
    contactMediums: [],
    projectStatuses: [],
    projectStages: [],
    topTags: [],
    totalProjects: 0,
    totalContacts: 0,
    totalSubmissions: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeWorkspaceId) {
      loadAnalytics()
    }
  }, [activeWorkspaceId])

  const loadAnalytics = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    try {
      // Get all data in parallel
      const [
        projectsRes,
        contactsRes,
        submissionsRes,
        projectGenresRes,
        contactGenresRes,
        projectMediumsRes,
        contactMediumsRes
      ] = await Promise.all([
        // Basic counts
        supabase
          .from('projects')
          .select('id, status, stage, tags')
          .eq('workspace_id', activeWorkspaceId),
        
        supabase
          .from('contacts')
          .select('id')
          .eq('workspace_id', activeWorkspaceId),
        
        supabase
          .from('submissions')
          .select('id')
          .eq('workspace_id', activeWorkspaceId),

        // Project genres
        supabase
          .from('project_genres')
          .select(`
            genres (
              name
            ),
            projects!inner (
              workspace_id
            )
          `)
          .eq('projects.workspace_id', activeWorkspaceId),

        // Contact genres  
        supabase
          .from('contact_genres')
          .select(`
            genres (
              name
            ),
            contacts!inner (
              workspace_id
            )
          `)
          .eq('contacts.workspace_id', activeWorkspaceId),

        // Project mediums
        supabase
          .from('project_mediums')
          .select(`
            mediums (
              name
            ),
            projects!inner (
              workspace_id
            )
          `)
          .eq('projects.workspace_id', activeWorkspaceId),

        // Contact mediums
        supabase
          .from('contact_mediums')
          .select(`
            mediums (
              name
            ),
            contacts!inner (
              workspace_id
            )
          `)
          .eq('contacts.workspace_id', activeWorkspaceId)
      ])

      // Process project genres
      const projectGenreCounts: { [key: string]: number } = {}
      projectGenresRes.data?.forEach(item => {
        if (item.genres) {
          const genreName = item.genres.name
          projectGenreCounts[genreName] = (projectGenreCounts[genreName] || 0) + 1
        }
      })

      // Process contact genres
      const contactGenreCounts: { [key: string]: number } = {}
      contactGenresRes.data?.forEach(item => {
        if (item.genres) {
          const genreName = item.genres.name
          contactGenreCounts[genreName] = (contactGenreCounts[genreName] || 0) + 1
        }
      })

      // Process project mediums
      const projectMediumCounts: { [key: string]: number } = {}
      projectMediumsRes.data?.forEach(item => {
        if (item.mediums) {
          const mediumName = item.mediums.name
          projectMediumCounts[mediumName] = (projectMediumCounts[mediumName] || 0) + 1
        }
      })

      // Process contact mediums
      const contactMediumCounts: { [key: string]: number } = {}
      contactMediumsRes.data?.forEach(item => {
        if (item.mediums) {
          const mediumName = item.mediums.name
          contactMediumCounts[mediumName] = (contactMediumCounts[mediumName] || 0) + 1
        }
      })

      // Process project statuses and stages
      const statusCounts: { [key: string]: number } = {}
      const stageCounts: { [key: string]: number } = {}
      const tagCounts: { [key: string]: number } = {}

      projectsRes.data?.forEach(project => {
        if (project.status) {
          statusCounts[project.status] = (statusCounts[project.status] || 0) + 1
        }
        if (project.stage) {
          stageCounts[project.stage] = (stageCounts[project.stage] || 0) + 1
        }
        if (project.tags) {
          project.tags.forEach(tag => {
            const cleanTag = tag.replace('#', '')
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1
          })
        }
      })

      // Convert to sorted arrays
      const sortByCount = (a: [string, number], b: [string, number]) => b[1] - a[1]

      setData({
        projectGenres: Object.entries(projectGenreCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        contactGenres: Object.entries(contactGenreCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        projectMediums: Object.entries(projectMediumCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        contactMediums: Object.entries(contactMediumCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        projectStatuses: Object.entries(statusCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        projectStages: Object.entries(stageCounts).sort(sortByCount).map(([name, count]) => ({ name, count })),
        topTags: Object.entries(tagCounts).sort(sortByCount).slice(0, 8).map(([name, count]) => ({ name, count })),
        totalProjects: projectsRes.data?.length || 0,
        totalContacts: contactsRes.data?.length || 0,
        totalSubmissions: submissionsRes.data?.length || 0
      })

    } catch (error) {
      console.error('Error loading analytics:', error)
    }
    setLoading(false)
  }

  // Bar Chart Component
  const BarChart = ({ 
    title, 
    data, 
    color = '#3b82f6',
    emptyMessage = 'No data available'
  }: { 
    title: string
    data: { name: string; count: number }[]
    color?: string
    emptyMessage?: string
  }) => {
    if (data.length === 0) {
      return (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            {title}
          </h3>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            {emptyMessage}
          </p>
        </div>
      )
    }

    const maxCount = Math.max(...data.map(item => item.count))

    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 24px 0' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ minWidth: '100px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                {item.name}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    height: '24px',
                    background: color,
                    borderRadius: '4px',
                    width: `${(item.count / maxCount) * 100}%`,
                    minWidth: '4px',
                    position: 'relative',
                    transition: 'width 0.3s ease'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  {item.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>Loading analytics...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Analytics</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Analyze your projects, contacts, and workspace activity.
          </p>
        </div>

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
              {data.totalProjects}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Projects</div>
          </div>
          
          <div style={statCardStyle}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
              {data.totalContacts}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Contacts</div>
          </div>
          
          <div style={statCardStyle}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {data.totalSubmissions}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Submissions</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <BarChart
            title="Project Genres"
            data={data.projectGenres}
            color="#3b82f6"
            emptyMessage="No project genres to display"
          />
          
          <BarChart
            title="Contact Genre Preferences"
            data={data.contactGenres}
            color="#10b981"
            emptyMessage="No contact genres to display"
          />
          
          <BarChart
            title="Project Mediums"
            data={data.projectMediums}
            color="#8b5cf6"
            emptyMessage="No project mediums to display"
          />
          
          <BarChart
            title="Contact Medium Preferences"
            data={data.contactMediums}
            color="#06b6d4"
            emptyMessage="No contact mediums to display"
          />
          
          <BarChart
            title="Project Status Distribution"
            data={data.projectStatuses}
            color="#f59e0b"
            emptyMessage="No project statuses to display"
          />
          
          <BarChart
            title="Project Stage Distribution"
            data={data.projectStages}
            color="#ef4444"
            emptyMessage="No project stages to display"
          />
        </div>

        {/* Tags Chart - Full Width */}
        {data.topTags.length > 0 && (
          <BarChart
            title="Most Used Tags"
            data={data.topTags}
            color="#ec4899"
            emptyMessage="No tags to display"
          />
        )}
      </div>
    </Layout>
  )
}