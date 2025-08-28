'use client'

import { useState, useEffect } from 'react'
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
  tags: string[] | null
  created_at: string
  project_mediums: { mediums: { name: string } }[]
  project_genres: { genres: { name: string } }[]
  project_budget_ranges: { budget_ranges: { label: string } }[]
}

type Medium = {
  id: number
  name: string
}

type Genre = {
  id: number
  name: string
}

const buttonStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  lineHeight: '1',
}

const primaryButtonStyle = {
  ...buttonStyle,
  background: '#3b82f6',
  color: '#ffffff',
}

const tagStyle = {
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '500',
  background: '#e5e7eb',
  color: '#374151',
  display: 'inline-block',
}

const pillButtonStyle = {
  padding: '6px 12px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '500',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'inline-block',
}

const selectedPillStyle = {
  ...pillButtonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
}

export default function ProjectsPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [mediums, setMediums] = useState<Medium[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [selectedMediums, setSelectedMediums] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Sorting states
  const [sortField, setSortField] = useState<'title' | 'created_at' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (activeWorkspaceId) {
      loadProjects()
      loadReferenceData()
    }
  }, [activeWorkspaceId])

  const loadProjects = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_mediums(
          mediums(name)
        ),
        project_genres(
          genres(name)
        ),
        project_budget_ranges(
          budget_ranges(label)
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading projects:', error)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const loadReferenceData = async () => {
    const [mediumsRes, genresRes] = await Promise.all([
      supabase.from('mediums').select('*').order('name'),
      supabase.from('genres').select('*').order('name')
    ])

    if (mediumsRes.data) setMediums(mediumsRes.data)
    if (genresRes.data) setGenres(genresRes.data)
  }

  const handleSort = (field: 'title' | 'created_at') => {
    if (sortField === field) {
      // Same field clicked, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field clicked, start with ascending (or descending for created_at)
      setSortField(field)
      setSortDirection(field === 'created_at' ? 'desc' : 'asc')
    }
  }

  const filteredProjects = projects.filter(project => {
    // Text search
    const search = searchTerm.toLowerCase()
    const matchesSearch = !search || (
      project.title.toLowerCase().includes(search) ||
      project.logline?.toLowerCase().includes(search) ||
      project.tags?.some(tag => tag.toLowerCase().includes(search))
    )

    // Medium filter
    const projectMediums = project.project_mediums?.map(pm => pm.mediums.name) || []
    const matchesMedium = selectedMediums.length === 0 || 
      selectedMediums.some(medium => projectMediums.includes(medium))

    // Genre filter
    const projectGenres = project.project_genres?.map(pg => pg.genres.name) || []
    const matchesGenre = selectedGenres.length === 0 || 
      selectedGenres.some(genre => projectGenres.includes(genre))

    // Status filter
    const matchesStatus = !selectedStatus || project.status === selectedStatus

    // Stage filter
    const matchesStage = !selectedStage || project.stage === selectedStage

    // Tags filter
    const projectTags = project.tags?.map(tag => tag.replace('#', '').toLowerCase()) || []
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => projectTags.includes(tag.toLowerCase()))

    return matchesSearch && matchesMedium && matchesGenre && matchesStatus && matchesStage && matchesTags
  })

  // Sort filtered projects
  const sortedAndFilteredProjects = [...filteredProjects].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string | Date
    let bValue: string | Date
    
    if (sortField === 'title') {
      aValue = a.title.toLowerCase()
      bValue = b.title.toLowerCase()
    } else if (sortField === 'created_at') {
      aValue = new Date(a.created_at)
      bValue = new Date(b.created_at)
    } else {
      return 0
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Get unique values for filter options
  const uniqueStatuses = Array.from(new Set(projects.map(p => p.status).filter(Boolean)))
  const uniqueStages = Array.from(new Set(projects.map(p => p.stage).filter(Boolean)))
  const uniqueTags = Array.from(new Set(
    projects
      .flatMap(p => p.tags || [])
      .map(tag => tag.replace('#', ''))
      .filter(Boolean)
  )).sort()

  const toggleMedium = (mediumName: string) => {
    setSelectedMediums(prev => 
      prev.includes(mediumName) 
        ? prev.filter(m => m !== mediumName)
        : [...prev, mediumName]
    )
  }

  const toggleGenre = (genreName: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreName) 
        ? prev.filter(g => g !== genreName)
        : [...prev, genreName]
    )
  }

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const clearAllFilters = () => {
    setSelectedMediums([])
    setSelectedGenres([])
    setSelectedTags([])
    setSelectedStatus('')
    setSelectedStage('')
    setSearchTerm('')
  }

  const hasActiveFilters = selectedMediums.length > 0 || selectedGenres.length > 0 || 
    selectedTags.length > 0 || selectedStatus || selectedStage || searchTerm

  // CSV Export Function
  const exportProjectsCSV = async () => {
    if (projects.length === 0) {
      alert('No projects to export')
      return
    }

    // Get full project data with notes for export
    const { data: fullProjects, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_mediums(
          mediums(name)
        ),
        project_genres(
          genres(name)
        )
      `)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error fetching full project data:', error)
      alert('Error exporting projects')
      return
    }

    const csvHeaders = ['TITLE', 'LOGLINE', 'STATUS', 'STAGE', 'MEDIUM', 'GENRES', 'TAGS', 'NOTES']
    const csvRows = fullProjects.map(project => {
      const mediums = project.project_mediums?.map((pm: any) => pm.mediums.name).join(',') || ''
      const genres = project.project_genres?.map((pg: any) => pg.genres.name).join(',') || ''
      const tags = project.tags?.join(',') || ''
      
      return [
        project.title || '',
        project.logline || '',
        project.status || '',
        project.stage || '',
        mediums,
        genres,
        tags,
        project.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`)
    })

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `projects-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CSV Upload Function
  const handleFileUpload = async () => {
    if (!uploadFile || !activeWorkspaceId) return

    setUploading(true)
    try {
      const text = await uploadFile.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, '').trim().toUpperCase())
      
      // Validate required columns
      const requiredColumns = ['TITLE']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        alert(`Missing required columns: ${missingColumns.join(', ')}`)
        return
      }

      // Get reference data for matching
      const [mediumsRes, genresRes] = await Promise.all([
        supabase.from('mediums').select('*'),
        supabase.from('genres').select('*')
      ])

      const mediumsMap = new Map((mediumsRes.data || []).map((m: any) => [m.name.toLowerCase(), m]))
      const genresMap = new Map((genresRes.data || []).map((g: any) => [g.name.toLowerCase(), g]))

      const projectsToInsert = []
      const junctionData = { mediums: [], genres: [] }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i])
        if (values.length === 0) continue

        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].replace(/"/g, '').trim() : ''
        })

        if (!row.TITLE) continue

        // Create project data
        const projectData = {
          workspace_id: activeWorkspaceId,
          title: row.TITLE,
          logline: row.LOGLINE || null,
          status: row.STATUS || null,
          stage: row.STAGE || null,
          notes: row.NOTES || null,
          roles: ['Writer'], // Default role as requested
          tags: row.TAGS ? row.TAGS.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null
        }

        projectsToInsert.push({ data: projectData, mediums: row.MEDIUM || '', genres: row.GENRES || '' })
      }

      if (projectsToInsert.length === 0) {
        alert('No valid projects found in CSV file')
        return
      }

      // Insert projects and get IDs
      for (const item of projectsToInsert) {
        const { data: project, error } = await supabase
          .from('projects')
          .insert([item.data])
          .select()
          .single()

        if (error) {
          console.error('Error inserting project:', error)
          continue
        }

        // Handle mediums
        if (item.mediums) {
          const mediumNames = item.mediums.split(',').map((m: string) => m.trim()).filter((m: string) => m)
          for (const mediumName of mediumNames) {
            const medium = mediumsMap.get(mediumName.toLowerCase())
            if (medium) {
              await supabase.from('project_mediums').insert({
                project_id: project.id,
                medium_id: medium.id
              })
            }
          }
        }

        // Handle genres
        if (item.genres) {
          const genreNames = item.genres.split(',').map((g: string) => g.trim()).filter((g: string) => g)
          for (const genreName of genreNames) {
            const genre = genresMap.get(genreName.toLowerCase())
            if (genre) {
              await supabase.from('project_genres').insert({
                project_id: project.id,
                genre_id: genre.id
              })
            }
          }
        }
      }

      alert(`Successfully imported ${projectsToInsert.length} projects`)
      setUploadFile(null)
      setShowUpload(false)
      loadProjects() // Refresh the list
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Error uploading CSV: ' + (error as any).message)
    }
    setUploading(false)
  }

  // Helper function to parse CSV rows properly
  const parseCSVRow = (row: string) => {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      
      if (char === '"' && (i === 0 || row[i-1] === ',')) {
        inQuotes = true
      } else if (char === '"' && inQuotes && (i === row.length - 1 || row[i+1] === ',')) {
        inQuotes = false
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current)
    return values
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Projects</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Manage your film projects and track submissions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowUpload(!showUpload)}
              style={{
                ...buttonStyle,
                background: '#10b981',
                color: '#ffffff',
              }}
            >
              Upload CSV
            </button>
            <button
              onClick={exportProjectsCSV}
              style={{
                ...buttonStyle,
                background: '#6366f1',
                color: '#ffffff',
              }}
            >
              Export CSV
            </button>
            <Link
              href="/projects/new"
              style={primaryButtonStyle}
            >
              Add Project
            </Link>
          </div>
        </div>

        {/* CSV Upload Form */}
        {showUpload && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Upload Projects CSV
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>
                Upload a CSV file with columns: TITLE, LOGLINE, STATUS, STAGE, MEDIUM, GENRES, TAGS, NOTES
              </p>
              <ul style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', paddingLeft: '20px' }}>
                <li>TITLE is required for each row</li>
                <li>ROLE will default to 'Writer' for all projects</li>
                <li>Multiple mediums should be separated by commas (,)</li>
                <li>Multiple genres should be separated by commas (,)</li>
                <li>Multiple tags should be separated by commas (,)</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowUpload(false)}
                  style={{
                    ...buttonStyle,
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || uploading}
                  style={{
                    ...buttonStyle,
                    background: uploading ? '#9ca3af' : '#10b981',
                    color: '#ffffff',
                    cursor: (!uploadFile || uploading) ? 'not-allowed' : 'pointer',
                    opacity: (!uploadFile || uploading) ? '0.5' : '1'
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload Projects'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'end', marginBottom: showFilters ? '24px' : '0' }}>
            <div style={{ flex: 1, maxWidth: '384px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Search Projects
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, logline, or tags..."
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  ...buttonStyle,
                  background: showFilters ? '#3b82f6' : '#ffffff',
                  color: showFilters ? '#ffffff' : '#374151',
                  border: '1px solid #d1d5db'
                }}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    ...buttonStyle,
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #dc2626'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Medium Filter */}
              {mediums.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Medium ({selectedMediums.length} selected)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {mediums.map((medium) => (
                      <button
                        key={medium.id}
                        onClick={() => toggleMedium(medium.name)}
                        style={selectedMediums.includes(medium.name) ? selectedPillStyle : pillButtonStyle}
                      >
                        {medium.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Genres Filter */}
              {genres.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Genres ({selectedGenres.length} selected)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {genres.map((genre) => (
                      <button
                        key={genre.id}
                        onClick={() => toggleGenre(genre.name)}
                        style={selectedGenres.includes(genre.name) ? selectedPillStyle : pillButtonStyle}
                      >
                        {genre.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Filter */}
              {uniqueTags.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Tags ({selectedTags.length} selected)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {uniqueTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={selectedTags.includes(tag) ? selectedPillStyle : pillButtonStyle}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status and Stage Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Status Filter */}
                {uniqueStatuses.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    >
                      <option value="">All Statuses</option>
                      {uniqueStatuses.map((status) => (
                        <option key={status} value={status || ''}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stage Filter */}
                {uniqueStages.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Stage
                    </label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    >
                      <option value="">All Stages</option>
                      {uniqueStages.map((stage) => (
                        <option key={stage} value={stage || ''}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Results Summary */}
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px', color: '#6b7280' }}>
                Showing {sortedAndFilteredProjects.length} of {projects.length} projects
                {hasActiveFilters && (
                  <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
                    (filtered)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Projects Grid */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          {sortedAndFilteredProjects.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
              {projects.length === 0 ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>No projects yet.</p>
                  <Link
                    href="/projects/new"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    Create your first project
                  </Link>
                </div>
              ) : (
                <p style={{ margin: 0 }}>No projects match your current filters.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1px', background: '#e5e7eb' }}>
              {/* Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 4fr 1fr 60px', 
                gap: '16px', 
                padding: '16px 24px', 
                background: '#f9fafb',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div 
                  onClick={() => handleSort('title')}
                  style={{ 
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#4f46e5'
                  }}
                >
                  Title
                  {sortField === 'title' && (
                    <span style={{ fontSize: '10px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
                <div>Logline</div>
                <div 
                  onClick={() => handleSort('created_at')}
                  style={{ 
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#4f46e5'
                  }}
                >
                  Date Added
                  {sortField === 'created_at' && (
                    <span style={{ fontSize: '10px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
                <div></div>
              </div>

              {/* Rows */}
              {sortedAndFilteredProjects.map((project) => (
                <div 
                  key={project.id} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 4fr 1fr 60px', 
                    gap: '16px', 
                    padding: '16px 24px', 
                    background: '#ffffff',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
                    >
                      {project.title}
                    </Link>
                    {project.tags && project.tags.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {project.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} style={tagStyle}>
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                        {project.tags.length > 3 && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            +{project.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                    {project.logline || '—'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {new Date(project.created_at).toLocaleDateString('en-GB')}
                  </div>
                  <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Link
                      href={`/projects/${project.id}`}
                      style={{ 
                        color: '#3b82f6', 
                        textDecoration: 'none', 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}