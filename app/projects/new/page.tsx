'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'
import { notifyProjectCreated } from '@/lib/notifications'

type Medium = {
  id: number
  name: string
}

type Genre = {
  id: number
  name: string
}

type BudgetRange = {
  id: number
  label: string
  unit: string
  min_value: number | null
  max_value: number | null
  medium_id: number | null
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  companies: { name: string } | null
  contact_mediums: { mediums: { id: number, name: string } }[]
  contact_genres: { genres: { id: number, name: string } }[]
  contact_budget_ranges: { budget_ranges: { id: number, label: string } }[]
  tags: string[] | null
  match_score?: number
  match_reasons?: string[]
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

const selectedPillStyle = {
  ...pillButtonStyle,
  background: '#3b82f6',
  color: '#ffffff',
  borderColor: '#3b82f6',
}

export default function NewProjectPage() {
  const { activeWorkspaceId, user } = useWorkspace()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mediums, setMediums] = useState<Medium[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [budgetRanges, setBudgetRanges] = useState<BudgetRange[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    logline: '',
    status: '',
    stage: '',
    notes: '',
    tags: ''
  })
  
  const [selectedMediums, setSelectedMediums] = useState<number[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [selectedBudgetRanges, setSelectedBudgetRanges] = useState<number[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [topTags, setTopTags] = useState<string[]>([])
  const [potentialMatches, setPotentialMatches] = useState<Contact[]>([])

  useEffect(() => {
    loadReferenceData()
    loadTopTags()
  }, [])

  useEffect(() => {
    loadBudgetRanges()
  }, [selectedMediums])

  useEffect(() => {
    findPotentialMatches()
  }, [selectedMediums, selectedGenres, selectedBudgetRanges, formData.tags, activeWorkspaceId])

  const loadReferenceData = async () => {
    const [mediumsRes, genresRes] = await Promise.all([
      supabase.from('mediums').select('*').order('name'),
      supabase.from('genres').select('*').order('name')
    ])

    if (mediumsRes.data) setMediums(mediumsRes.data)
    if (genresRes.data) setGenres(genresRes.data)
  }

  const loadTopTags = async () => {
    if (!activeWorkspaceId) return

    // Get all projects with tags from current workspace
    const { data: projects, error } = await supabase
      .from('projects')
      .select('tags')
      .eq('workspace_id', activeWorkspaceId)
      .not('tags', 'is', null)

    if (error) {
      console.error('Error loading top tags:', error)
      return
    }

    // Count tag frequency
    const tagCounts: { [key: string]: number } = {}
    
    projects?.forEach(project => {
      if (project.tags) {
        project.tags.forEach((tag: string) => {
          // Remove # if it exists at the start
          const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1
        })
      }
    })

    // Get top 10 most used tags
    const sortedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)

    setTopTags(sortedTags)
  }

  const loadBudgetRanges = async () => {
    if (selectedMediums.length === 0) {
      setBudgetRanges([])
      return
    }

    const { data, error } = await supabase
      .from('budget_ranges')
      .select('*')
      .in('medium_id', selectedMediums)
      .order('min_value')

    if (error) {
      console.error('Error loading budget ranges:', error)
    } else {
      setBudgetRanges(data || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId) return

    setLoading(true)
    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { data: project, error } = await supabase
        .from('projects')
        .insert([{
          workspace_id: activeWorkspaceId,
          title: formData.title,
          logline: formData.logline || null,
          status: formData.status || null,
          stage: formData.stage || null,
          notes: formData.notes || null,
          tags: tags.length > 0 ? tags : null,
          roles: selectedRoles.length > 0 ? selectedRoles : null
        }])
        .select()
        .single()

      if (error) throw error

      // Insert junction table data
      const junctionInserts: any[] = []
      
      selectedGenres.forEach(genreId => {
        junctionInserts.push(
          supabase.from('project_genres').insert({
            project_id: project.id,
            genre_id: genreId
          })
        )
      })

      await Promise.all(junctionInserts)
      
      // Create notification for workspace members
      if (user?.id) {
        await notifyProjectCreated(
          activeWorkspaceId,
          user.id,
          project.id,
          project.title
        )
      }
      
      router.push(`/projects/${project.id}`)
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert('Error creating project: ' + error.message)
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const toggleSelection = (id: number, currentArray: number[], setter: (arr: number[]) => void) => {
    if (currentArray.includes(id)) {
      setter(currentArray.filter(item => item !== id))
    } else {
      setter([...currentArray, id])
    }
  }

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const availableRoles = ['Writer', 'Director', 'Producer']

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
    }
  }

  const addTagToInput = (tag: string) => {
    const currentTags = formData.tags
    const tagsArray = currentTags ? currentTags.split(',').map(t => t.trim()).filter(t => t) : []
    
    // Add # if not already present
    const formattedTag = tag.startsWith('#') ? tag : `#${tag}`
    
    // Don't add if already exists
    if (!tagsArray.includes(formattedTag)) {
      const newTags = [...tagsArray, formattedTag].join(', ')
      setFormData(prev => ({
        ...prev,
        tags: newTags
      }))
    }
  }

  const findPotentialMatches = async () => {
    if (!activeWorkspaceId || (selectedMediums.length === 0 && selectedGenres.length === 0 && selectedBudgetRanges.length === 0 && !formData.tags.trim())) {
      setPotentialMatches([])
      return
    }

    try {
      // Get all contacts with their relationships
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          tags,
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
        .eq('workspace_id', activeWorkspaceId)

      if (error) {
        console.error('Error loading contacts for matching:', error)
        return
      }

      // Calculate match scores
      const projectTags = formData.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase().replace('#', ''))
        .filter(tag => tag.length > 0)

      const matchedContacts = contacts
        ?.map((contact: any) => {
          let score = 0
          const reasons: string[] = []

          // Check medium matches
          const contactMediumIds = contact.contact_mediums?.map((cm: any) => cm.mediums.id) || []
          const mediumMatches = selectedMediums.filter(id => contactMediumIds.includes(id))
          if (mediumMatches.length > 0) {
            score += mediumMatches.length * 3
            const mediumNames = contact.contact_mediums
              ?.filter((cm: any) => selectedMediums.includes(cm.mediums.id))
              .map((cm: any) => cm.mediums.name)
            reasons.push(`Works with ${mediumNames.join(', ')}`)
          }

          // Check genre matches
          const contactGenreIds = contact.contact_genres?.map((cg: any) => cg.genres.id) || []
          const genreMatches = selectedGenres.filter(id => contactGenreIds.includes(id))
          if (genreMatches.length > 0) {
            score += genreMatches.length * 2
            const genreNames = contact.contact_genres
              ?.filter((cg: any) => selectedGenres.includes(cg.genres.id))
              .map((cg: any) => cg.genres.name)
            reasons.push(`Interested in ${genreNames.join(', ')}`)
          }

          // Check budget range matches
          const contactBudgetIds = contact.contact_budget_ranges?.map((cbr: any) => cbr.budget_ranges.id) || []
          const budgetMatches = selectedBudgetRanges.filter(id => contactBudgetIds.includes(id))
          if (budgetMatches.length > 0) {
            score += budgetMatches.length * 2
            reasons.push(`Works with matching budget ranges`)
          }

          // Check tag matches
          if (contact.tags && projectTags.length > 0) {
            const contactTags = contact.tags.map((tag: string) => tag.toLowerCase().replace('#', ''))
            const tagMatches = projectTags.filter(tag => contactTags.includes(tag))
            if (tagMatches.length > 0) {
              score += tagMatches.length
              reasons.push(`Shares tags: ${tagMatches.map(tag => `#${tag}`).join(', ')}`)
            }
          }

          return {
            ...contact,
            match_score: score,
            match_reasons: reasons
          }
        })
        .filter((contact: any) => contact.match_score > 0)
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 10) || []

      setPotentialMatches(matchedContacts)
    } catch (error) {
      console.error('Error finding potential matches:', error)
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>New project</h1>
        </div>

        <div style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Title and Logline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '18px' }}
                placeholder="Title"
              />
              
              <input
                type="text"
                name="logline"
                value={formData.logline}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Logline"
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Role</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    style={selectedRoles.includes(role) ? selectedPillStyle : pillButtonStyle}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Status and Stage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Status:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">—</option>
                  <option value="In Development">In Development</option>
                  <option value="Available">Available</option>
                  <option value="Optioned">Optioned</option>
                  <option value="Sold">Sold</option>
                  <option value="In Turnaround">In Turnaround</option>
                  <option value="Financing">Financing</option>
                  <option value="Casting">Casting</option>
                  <option value="In Production">In Production</option>
                  <option value="Produced">Produced</option>
                  <option value="Released">Released</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Stage:</label>
                <select
                  name="stage"
                  value={formData.stage}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">—</option>
                  <option value="Concept">Concept</option>
                  <option value="One Pager">One Pager</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Deck">Deck</option>
                  <option value="Draft">Draft</option>
                  <option value="Final Draft">Final Draft</option>
                </select>
              </div>
            </div>

            {/* Medium */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Medium</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {mediums.map((medium) => (
                  <button
                    key={medium.id}
                    type="button"
                    onClick={() => toggleSelection(medium.id, selectedMediums, setSelectedMediums)}
                    style={selectedMediums.includes(medium.id) ? selectedPillStyle : pillButtonStyle}
                  >
                    {medium.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget - shows when mediums are selected */}
            {selectedMediums.length > 0 && budgetRanges.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Budget</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {budgetRanges.map((range) => (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => toggleSelection(range.id, selectedBudgetRanges, setSelectedBudgetRanges)}
                      style={selectedBudgetRanges.includes(range.id) ? selectedPillStyle : pillButtonStyle}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Genres */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Genres</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleSelection(genre.id, selectedGenres, setSelectedGenres)}
                    style={selectedGenres.includes(genre.id) ? selectedPillStyle : pillButtonStyle}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                onKeyDown={handleTagKeyDown}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Add tags separated by commas (e.g., #contained, #thriller, #lowbudget)"
              />
              
              {/* Top 10 Most Used Tags */}
              {topTags.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Most used tags:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {topTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTagToInput(tag)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e5e7eb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f9fafb'
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Notes</label>
              <textarea
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Notes"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '16px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ 
                  padding: '8px 24px', 
                  background: '#4b5563', 
                  color: '#ffffff', 
                  borderRadius: '6px', 
                  border: 'none',
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                style={{ 
                  padding: '8px 24px', 
                  background: '#ffffff', 
                  color: '#374151', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Potential Matches Section */}
        {potentialMatches.length > 0 && (
          <div style={{ marginTop: '32px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              Potential Contact Matches
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Based on the mediums, genres, budget ranges, and tags you've selected, here are contacts that might be a good fit for this project:
            </p>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {potentialMatches.map((contact) => (
                <div
                  key={contact.id}
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
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {(contact.companies?.name || contact.role) && (
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                          {contact.role && contact.companies?.name 
                            ? `${contact.role} at ${contact.companies.name}`
                            : contact.role || contact.companies?.name
                          }
                        </p>
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
                      {contact.match_score} match{contact.match_score !== 1 ? 'es' : ''}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                      Match reasons:
                    </p>
                    <ul style={{ fontSize: '14px', color: '#6b7280', margin: 0, paddingLeft: '20px' }}>
                      {contact.match_reasons?.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
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
                        Email
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        style={{
                          padding: '6px 12px',
                          background: '#10b981',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontSize: '14px',
                          textDecoration: 'none',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        Call
                      </a>
                    )}
                    <a
                      href={`/contacts/${contact.id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      View Profile
                    </a>
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