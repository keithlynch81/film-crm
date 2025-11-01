'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

interface NotebookEntry {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
  user_id: string
  linked_project_id?: string
  projects?: { title: string }
  notebook_mediums?: { mediums: { name: string } }[]
  notebook_genres?: { genres: { name: string } }[]
  notebook_idea_types?: { idea_types: { name: string } }[]
}

interface Medium {
  id: string
  name: string
}

interface Genre {
  id: string
  name: string
}

interface IdeaType {
  id: string
  name: string
}

interface Project {
  id: string
  title: string
}

const suggestedTags = [
  '#fight scene', '#shootout', '#car chase', '#joke', '#character quirk', '#backstory',
  '#plot twist', '#romance', '#betrayal', '#death scene', '#chase scene', '#explosion',
  '#one-liner', '#monologue', '#flashback', '#dream sequence', '#villain reveal'
]

const pillButtonStyle = {
  padding: '8px 16px',
  borderRadius: '9999px',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  margin: '4px',
  display: 'inline-block',
  textAlign: 'center' as const,
  textDecoration: 'none'
}

const selectedPillStyle = {
  ...pillButtonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6'
}

export default function NotebookPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<NotebookEntry[]>([])
  const [mediums, setMediums] = useState<Medium[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [ideaTypes, setIdeaTypes] = useState<IdeaType[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null)
  const [user, setUser] = useState<any>(null)

  // Filter states
  const [selectedMediumFilter, setSelectedMediumFilter] = useState<string>('')
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('')
  const [selectedIdeaTypeFilter, setSelectedIdeaTypeFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [hideUsedIdeas, setHideUsedIdeas] = useState<boolean>(false)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    selectedMediums: [] as string[],
    selectedGenres: [] as string[],
    selectedIdeaTypes: [] as string[],
    linkedProjectId: '' as string
  })

  // Project autocomplete state
  const [projectSearch, setProjectSearch] = useState<string>('')
  const [showProjectSuggestions, setShowProjectSuggestions] = useState<boolean>(false)
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])

  useEffect(() => {
    if (activeWorkspaceId) {
      loadData()
    }
  }, [activeWorkspaceId])

  // Filter entries whenever filters change
  useEffect(() => {
    applyFilters()
  }, [entries, selectedMediumFilter, selectedGenreFilter, selectedIdeaTypeFilter, tagFilter, hideUsedIdeas, searchTerm])

  const loadData = async () => {
    if (!activeWorkspaceId) return
    
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      setUser(currentUser)

      // Load reference data and projects using activeWorkspaceId
      const [mediumsRes, genresRes, projectsRes] = await Promise.all([
        supabase.from('mediums').select('*').order('name'),
        supabase.from('genres').select('*').order('name'),
        supabase.from('projects').select('id, title').eq('workspace_id', activeWorkspaceId).order('title')
      ])

      setMediums(mediumsRes.data || [])
      setGenres(genresRes.data || [])
      setProjects(projectsRes.data || [])
      
      // Debug logging
      console.log('Projects loaded:', {
        activeWorkspaceId,
        count: projectsRes.data?.length || 0,
        projects: projectsRes.data?.slice(0, 3), // Show first 3
        allProjectTitles: projectsRes.data?.map(p => p.title) || [],
        error: projectsRes.error,
        rawData: projectsRes.data
      })
      
      // Add test projects if none exist (for development)
      if (!projectsRes.data || projectsRes.data.length === 0) {
        console.log('No projects found - the autocomplete won\'t work until projects are created')
      }
      
      // Set hardcoded idea types for now (until tables are created)
      setIdeaTypes([
        { id: '1', name: 'Character' },
        { id: '2', name: 'Scene' },
        { id: '3', name: 'Action Sequence' },
        { id: '4', name: 'Dialogue' },
        { id: '5', name: 'Location' }
      ])

      // Try to load notebook entries, but handle gracefully if table doesn't exist
      try {
        if (activeWorkspaceId) await loadNotebookEntries(activeWorkspaceId)
      } catch (error: any) {
        console.log('Notebook table not ready yet:', error.code)
        // Table doesn't exist yet - that's okay, we'll show empty state
        setEntries([])
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotebookEntries = async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('notebook_entries')
      .select(`
        *,
        projects(title),
        notebook_mediums(
          mediums(name)
        ),
        notebook_genres(
          genres(name)
        ),
        notebook_idea_types(
          idea_types(name)
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading notebook entries:', error)
      return
    }

    setEntries(data || [])
  }

  const applyFilters = () => {
    let filtered = [...entries]

    // Text search in title and content
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(search) ||
        entry.content.toLowerCase().includes(search)
      )
    }

    // Filter by medium
    if (selectedMediumFilter) {
      filtered = filtered.filter(entry => 
        entry.notebook_mediums?.some(nm => nm.mediums.name === selectedMediumFilter)
      )
    }

    // Filter by genre
    if (selectedGenreFilter) {
      filtered = filtered.filter(entry => 
        entry.notebook_genres?.some(ng => ng.genres.name === selectedGenreFilter)
      )
    }

    // Filter by idea type
    if (selectedIdeaTypeFilter) {
      filtered = filtered.filter(entry => 
        entry.notebook_idea_types?.some(nit => nit.idea_types.name === selectedIdeaTypeFilter)
      )
    }

    // Filter by tag
    if (tagFilter) {
      const searchTag = tagFilter.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.tags?.some(tag => tag.toLowerCase().includes(searchTag))
      )
    }

    // Filter out used ideas if checkbox is checked
    if (hideUsedIdeas) {
      filtered = filtered.filter(entry => !entry.linked_project_id)
    }

    setFilteredEntries(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !activeWorkspaceId) return

    try {
      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // Try to create notebook entry
      const { data: entry, error: entryError } = await supabase
        .from('notebook_entries')
        .insert({
          workspace_id: activeWorkspaceId,
          user_id: user.id,
          title: formData.title,
          content: formData.content,
          tags: tagsArray,
          linked_project_id: formData.linkedProjectId || null
        })
        .select()
        .single()

      if (entryError) {
        if (entryError.code === '42P01') {
          alert('Notebook tables need to be set up. Please contact your administrator to run the notebook migration.')
          return
        }
        throw entryError
      }

      // Add medium associations
      if (formData.selectedMediums.length > 0) {
        const mediumInserts = formData.selectedMediums.map(mediumId => ({
          notebook_entry_id: entry.id,
          medium_id: mediumId
        }))
        const { error: mediumError } = await supabase.from('notebook_mediums').insert(mediumInserts)
        if (mediumError) console.log('Medium association error (expected if table not created):', mediumError)
      }

      // Add genre associations
      if (formData.selectedGenres.length > 0) {
        const genreInserts = formData.selectedGenres.map(genreId => ({
          notebook_entry_id: entry.id,
          genre_id: genreId
        }))
        const { error: genreError } = await supabase.from('notebook_genres').insert(genreInserts)
        if (genreError) console.log('Genre association error (expected if table not created):', genreError)
      }

      // Add idea type associations
      if (formData.selectedIdeaTypes.length > 0) {
        const ideaTypeInserts = formData.selectedIdeaTypes.map(ideaTypeId => ({
          notebook_entry_id: entry.id,
          idea_type_id: ideaTypeId
        }))
        const { error: ideaTypeError } = await supabase.from('notebook_idea_types').insert(ideaTypeInserts)
        if (ideaTypeError) console.log('Idea type association error (expected if table not created):', ideaTypeError)
      }

      // Reset form and reload data
      setFormData({
        title: '',
        content: '',
        tags: '',
        selectedMediums: [],
        selectedGenres: [],
        selectedIdeaTypes: [],
        linkedProjectId: ''
      })
      setProjectSearch('')
      setShowProjectSuggestions(false)
      setShowForm(false)
      setEditingEntry(null)
      try {
        if (activeWorkspaceId) await loadNotebookEntries(activeWorkspaceId)
      } catch (loadError) {
        console.log('Loading entries failed (expected if tables not created)')
      }

    } catch (error) {
      console.error('Error creating notebook entry:', error)
      alert('Error creating notebook entry. Please ensure database tables are set up.')
    }
  }

  const handleEdit = (entry: NotebookEntry) => {
    setEditingEntry(entry)
    setFormData({
      title: entry.title,
      content: entry.content,
      tags: entry.tags?.join(', ') || '',
      selectedMediums: entry.notebook_mediums?.map(nm => 
        mediums.find(m => m.name === nm.mediums.name)?.id || ''
      ).filter(Boolean) || [],
      selectedGenres: entry.notebook_genres?.map(ng => 
        genres.find(g => g.name === ng.genres.name)?.id || ''
      ).filter(Boolean) || [],
      selectedIdeaTypes: entry.notebook_idea_types?.map(nit => 
        ideaTypes.find(it => it.name === nit.idea_types.name)?.id || ''
      ).filter(Boolean) || [],
      linkedProjectId: entry.linked_project_id || ''
    })
    
    // Set project search field
    if (entry.projects?.title) {
      setProjectSearch(entry.projects.title)
    } else {
      setProjectSearch('')
    }
    setShowProjectSuggestions(false)
    setShowForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !activeWorkspaceId || !editingEntry) return

    try {
      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // Update notebook entry
      const { error: updateError } = await supabase
        .from('notebook_entries')
        .update({
          title: formData.title,
          content: formData.content,
          tags: tagsArray,
          linked_project_id: formData.linkedProjectId || null
        })
        .eq('id', editingEntry.id)

      if (updateError) throw updateError

      // Delete existing associations
      await Promise.all([
        supabase.from('notebook_mediums').delete().eq('notebook_entry_id', editingEntry.id),
        supabase.from('notebook_genres').delete().eq('notebook_entry_id', editingEntry.id),
        supabase.from('notebook_idea_types').delete().eq('notebook_entry_id', editingEntry.id)
      ])

      // Add new associations
      if (formData.selectedMediums.length > 0) {
        const mediumInserts = formData.selectedMediums.map(mediumId => ({
          notebook_entry_id: editingEntry.id,
          medium_id: mediumId
        }))
        await supabase.from('notebook_mediums').insert(mediumInserts)
      }

      if (formData.selectedGenres.length > 0) {
        const genreInserts = formData.selectedGenres.map(genreId => ({
          notebook_entry_id: editingEntry.id,
          genre_id: genreId
        }))
        await supabase.from('notebook_genres').insert(genreInserts)
      }

      if (formData.selectedIdeaTypes.length > 0) {
        const ideaTypeInserts = formData.selectedIdeaTypes.map(ideaTypeId => ({
          notebook_entry_id: editingEntry.id,
          idea_type_id: ideaTypeId
        }))
        await supabase.from('notebook_idea_types').insert(ideaTypeInserts)
      }

      // Reset form and reload
      setFormData({
        title: '',
        content: '',
        tags: '',
        selectedMediums: [],
        selectedGenres: [],
        selectedIdeaTypes: [],
        linkedProjectId: ''
      })
      setProjectSearch('')
      setShowProjectSuggestions(false)
      setShowForm(false)
      setEditingEntry(null)
      if (activeWorkspaceId) await loadNotebookEntries(activeWorkspaceId)

    } catch (error) {
      console.error('Error updating notebook entry:', error)
      alert('Error updating notebook entry. Please try again.')
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return

    try {
      const { error } = await supabase
        .from('notebook_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      if (activeWorkspaceId) await loadNotebookEntries(activeWorkspaceId)
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Error deleting entry. Please try again.')
    }
  }

  const clearFilters = () => {
    setSelectedMediumFilter('')
    setSelectedGenreFilter('')
    setSelectedIdeaTypeFilter('')
    setTagFilter('')
    setHideUsedIdeas(false)
  }

  const getUniqueTagsFromEntries = () => {
    const allTags = entries.flatMap(entry => entry.tags || [])
    return Array.from(new Set(allTags)).sort()
  }

  // Project autocomplete functions
  const handleProjectSearch = (value: string) => {
    console.log('Project search called:', { value, totalProjects: projects.length, allProjects: projects })
    setProjectSearch(value)
    if (value.trim() === '') {
      setFilteredProjects([])
      setShowProjectSuggestions(false)
      return
    }
    
    // Check if we have any projects at all
    if (projects.length === 0) {
      console.log('No projects available for autocomplete')
      setFilteredProjects([])
      setShowProjectSuggestions(false)
      return
    }
    
    const filtered = projects.filter(project => 
      project.title.toLowerCase().includes(value.toLowerCase())
    )
    console.log('Filtered projects:', { 
      searchTerm: value.toLowerCase(), 
      filtered, 
      totalProjects: projects.length,
      projectTitles: projects.map(p => p.title.toLowerCase())
    })
    setFilteredProjects(filtered)
    setShowProjectSuggestions(filtered.length > 0)
  }

  const selectProject = (project: Project) => {
    setFormData(prev => ({ ...prev, linkedProjectId: project.id }))
    setProjectSearch(project.title)
    setShowProjectSuggestions(false)
  }

  const clearProjectLink = () => {
    setFormData(prev => ({ ...prev, linkedProjectId: '' }))
    setProjectSearch('')
    setShowProjectSuggestions(false)
  }

  // Pill button toggle functions
  const toggleMedium = (mediumId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMediums: prev.selectedMediums.includes(mediumId)
        ? prev.selectedMediums.filter(id => id !== mediumId)
        : [...prev.selectedMediums, mediumId]
    }))
  }

  const toggleGenre = (genreId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter(id => id !== genreId)
        : [...prev.selectedGenres, genreId]
    }))
  }

  const toggleIdeaType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedIdeaTypes: prev.selectedIdeaTypes.includes(typeId)
        ? prev.selectedIdeaTypes.filter(id => id !== typeId)
        : [...prev.selectedIdeaTypes, typeId]
    }))
  }

  const handleTagSuggestionClick = (tag: string) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    if (!currentTags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags ? `${prev.tags}, ${tag}` : tag
      }))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading notebook...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            color: '#111827',
            fontWeight: 'bold'
          }}>
            Creative Notebook
          </h1>

          {/* Mobile: Plus icon button */}
          <button
            onClick={() => {
              setEditingEntry(null)
              setFormData({
                title: '',
                content: '',
                tags: '',
                selectedMediums: [],
                selectedGenres: [],
                selectedIdeaTypes: [],
                linkedProjectId: ''
              })
              setShowForm(!showForm)
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="mobile-plus-button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Desktop: Full button */}
          <button
            onClick={() => {
              setEditingEntry(null)
              setFormData({
                title: '',
                content: '',
                tags: '',
                selectedMediums: [],
                selectedGenres: [],
                selectedIdeaTypes: [],
                linkedProjectId: ''
              })
              setShowForm(!showForm)
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            className="desktop-button"
          >
            {showForm ? 'Cancel' : '+ New Idea'}
          </button>
        </div>

        {/* Description text - desktop only */}
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }} className="desktop-description">
          Capture your creative ideas and inspiration.
        </div>

        <style jsx>{`
          @media (max-width: 768px) {
            .desktop-button {
              display: none !important;
            }
            .desktop-description {
              display: none !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-plus-button {
              display: none !important;
            }
          }
        `}</style>

        {/* Search and Filters */}
        {!showForm && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'end', marginBottom: showFilters ? '24px' : '0' }}>
              <div style={{ flex: 1, maxWidth: '384px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Search Ideas
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title or content..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: showFilters ? '#3b82f6' : '#ffffff',
                    color: showFilters ? '#ffffff' : '#374151',
                    border: '1px solid ' + (showFilters ? '#3b82f6' : '#d1d5db'),
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                
                {(selectedMediumFilter || selectedGenreFilter || selectedIdeaTypeFilter || tagFilter || hideUsedIdeas || searchTerm) && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setSearchTerm('')
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>Advanced Filters</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  {/* Medium Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Medium</label>
                    <select
                      value={selectedMediumFilter}
                      onChange={(e) => setSelectedMediumFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">All Mediums</option>
                      {mediums.map(medium => (
                        <option key={medium.id} value={medium.name}>{medium.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Genre Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Genre</label>
                    <select
                      value={selectedGenreFilter}
                      onChange={(e) => setSelectedGenreFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">All Genres</option>
                      {genres.map(genre => (
                        <option key={genre.id} value={genre.name}>{genre.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Idea Type Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Idea Type</label>
                    <select
                      value={selectedIdeaTypeFilter}
                      onChange={(e) => setSelectedIdeaTypeFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">All Types</option>
                      {ideaTypes.map(type => (
                        <option key={type.id} value={type.name}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tag Filter */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Tag</label>
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                {/* Hide Used Ideas Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="hideUsedIdeas"
                    checked={hideUsedIdeas}
                    onChange={(e) => setHideUsedIdeas(e.target.checked)}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <label htmlFor="hideUsedIdeas" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                    Hide ideas already used in projects
                  </label>
                </div>

                {/* Results Count */}
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                  Showing {filteredEntries.length} of {entries.length} ideas
                  {(selectedMediumFilter || selectedGenreFilter || selectedIdeaTypeFilter || tagFilter || hideUsedIdeas || searchTerm) && (
                    <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
                      (filtered)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Entry Form */}
        {showForm && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', color: '#111827' }}>
              {editingEntry ? 'Edit Creative Idea' : 'New Creative Idea'}
            </h2>
            
            <form onSubmit={editingEntry ? handleUpdate : handleSubmit}>
              {/* Title */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., Epic sword fight in rain"
                />
              </div>

              {/* Content */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Note *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Describe your creative idea..."
                />
              </div>

              {/* Mediums */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Medium
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {mediums.map(medium => (
                    <button
                      key={medium.id}
                      type="button"
                      onClick={() => toggleMedium(medium.id)}
                      style={formData.selectedMediums.includes(medium.id) ? selectedPillStyle : pillButtonStyle}
                    >
                      {medium.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Genre
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      style={formData.selectedGenres.includes(genre.id) ? selectedPillStyle : pillButtonStyle}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Idea Types */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Idea Type
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ideaTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleIdeaType(type.id)}
                      style={formData.selectedIdeaTypes.includes(type.id) ? selectedPillStyle : pillButtonStyle}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Link */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Link to Project (optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => handleProjectSearch(e.target.value)}
                    onFocus={() => {
                      console.log('Input focused:', { projectSearch, filteredProjectsLength: filteredProjects.length })
                      if (projectSearch && filteredProjects.length > 0) {
                        setShowProjectSuggestions(true)
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    placeholder={projects.length > 0 ? "Start typing to search projects..." : "No projects found - create a project first"}
                  />
                  {formData.linkedProjectId && (
                    <button
                      type="button"
                      onClick={clearProjectLink}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                  
                  {/* Project Suggestions Dropdown */}
                  {showProjectSuggestions && filteredProjects.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 10,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {filteredProjects.map(project => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => selectProject(project)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          {project.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {projects.length > 0 
                    ? "Link this idea to a project when you use it" 
                    : `No projects available. Go to Projects page to create one first. (Found ${projects.length} projects)`
                  }
                </div>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter tags separated by commas"
                />
                
                {/* Suggested Tags */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                    Suggested tags:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {suggestedTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagSuggestionClick(tag)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: editingEntry ? 'space-between' : 'flex-end' }}>
                {editingEntry && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingEntry.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  >
                    Delete
                  </button>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save Idea
                </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Entries List */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredEntries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No ideas yet</h3>
              <p>Start capturing your creative ideas and inspiration!</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#111827', width: '100%' }}>
                    {entry.title}
                  </h3>
                  {entry.projects?.title && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#059669',
                      backgroundColor: '#d1fae5',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      🔗 Used in: {entry.projects.title}
                    </div>
                  )}
                </div>
                
                <p style={{ margin: '0 0 16px 0', color: '#374151', lineHeight: '1.5' }}>
                  {entry.content}
                </p>

                {/* Meta information */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  {/* Mediums */}
                  {entry.notebook_mediums && entry.notebook_mediums.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {entry.notebook_mediums.map((nm, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '10px'
                          }}
                        >
                          {nm.mediums.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Genres */}
                  {entry.notebook_genres && entry.notebook_genres.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {entry.notebook_genres.map((ng, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            borderRadius: '10px'
                          }}
                        >
                          {ng.genres.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Idea Types */}
                  {entry.notebook_idea_types && entry.notebook_idea_types.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {entry.notebook_idea_types.map((nit, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '10px'
                          }}
                        >
                          {nit.idea_types.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            borderRadius: '10px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Edit button positioned at bottom right */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={() => handleEdit(entry)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}