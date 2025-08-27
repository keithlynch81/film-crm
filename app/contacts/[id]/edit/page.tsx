'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Company = {
  id: string
  name: string
}

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

export default function EditContactPage() {
  const params = useParams()
  const { activeWorkspaceId } = useWorkspace()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [mediums, setMediums] = useState<Medium[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [budgetRanges, setBudgetRanges] = useState<BudgetRange[]>([])
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    company_id: '',
    new_company_name: '',
    remit_notes: '',
    taste_notes: '',
    additional_notes: '',
    tags: ''
  })

  const [selectedMediums, setSelectedMediums] = useState<number[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [selectedBudgetRanges, setSelectedBudgetRanges] = useState<number[]>([])
  const [topTags, setTopTags] = useState<string[]>([])
  const [companySearchTerm, setCompanySearchTerm] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (activeWorkspaceId && params.id) {
      loadCompanies()
      loadContact()
    }
    loadReferenceData()
    loadTopTags()
  }, [activeWorkspaceId, params.id])

  useEffect(() => {
    loadBudgetRanges()
  }, [selectedMediums])

  useEffect(() => {
    if (companySearchTerm) {
      const filtered = companies.filter(company =>
        company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
      )
      setFilteredCompanies(filtered)
      setShowCompanyDropdown(true)
    } else {
      setFilteredCompanies(companies)
      setShowCompanyDropdown(false)
    }
  }, [companySearchTerm, companies])

  const loadCompanies = async () => {
    if (!activeWorkspaceId) return

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('name')

    if (error) {
      console.error('Error loading companies:', error)
    } else {
      setCompanies(data || [])
    }
  }

  const loadReferenceData = async () => {
    const [mediumsRes, genresRes] = await Promise.all([
      supabase.from('mediums').select('*').order('name'),
      supabase.from('genres').select('*').order('name')
    ])

    if (mediumsRes.data) setMediums(mediumsRes.data)
    if (genresRes.data) setGenres(genresRes.data)
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

  const loadTopTags = async () => {
    if (!activeWorkspaceId) return

    // Get all contacts with tags from current workspace
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('tags')
      .eq('workspace_id', activeWorkspaceId)
      .not('tags', 'is', null)

    if (error) {
      console.error('Error loading top tags:', error)
      return
    }

    // Count tag frequency
    const tagCounts: { [key: string]: number } = {}
    
    contacts?.forEach(contact => {
      if (contact.tags) {
        contact.tags.forEach((tag: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId) return

    setLoading(true)
    try {
      let companyId = formData.company_id

      // Create new company if needed (when there's a search term but no selected company)
      if (companySearchTerm && !formData.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([{
            workspace_id: activeWorkspaceId,
            name: companySearchTerm
          }])
          .select()
          .single()

        if (companyError) throw companyError
        companyId = company.id
      }

      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const { error } = await supabase
        .from('contacts')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role || null,
          company_id: companyId || null,
          remit_notes: formData.remit_notes || null,
          taste_notes: formData.taste_notes || null,
          additional_notes: formData.additional_notes || null,
          tags: tags.length > 0 ? tags : null
        })
        .eq('id', params.id)
        .eq('workspace_id', activeWorkspaceId)

      if (error) throw error

      // Update medium selections
      await supabase.from('contact_mediums').delete().eq('contact_id', params.id)
      if (selectedMediums.length > 0) {
        const mediumInserts = selectedMediums.map(mediumId => ({
          contact_id: params.id as string,
          medium_id: mediumId
        }))
        const { error: mediumError } = await supabase
          .from('contact_mediums')
          .insert(mediumInserts)
        if (mediumError) throw mediumError
      }

      // Update genre selections
      await supabase.from('contact_genres').delete().eq('contact_id', params.id)
      if (selectedGenres.length > 0) {
        const genreInserts = selectedGenres.map(genreId => ({
          contact_id: params.id as string,
          genre_id: genreId
        }))
        const { error: genreError } = await supabase
          .from('contact_genres')
          .insert(genreInserts)
        if (genreError) throw genreError
      }

      // Update budget range selections
      await supabase.from('contact_budget_ranges').delete().eq('contact_id', params.id)
      if (selectedBudgetRanges.length > 0) {
        const budgetInserts = selectedBudgetRanges.map(budgetId => ({
          contact_id: params.id as string,
          budget_range_id: budgetId
        }))
        const { error: budgetError } = await supabase
          .from('contact_budget_ranges')
          .insert(budgetInserts)
        if (budgetError) throw budgetError
      }

      router.push(`/contacts/${params.id}`)
    } catch (error: any) {
      console.error('Error updating contact:', error)
      alert('Error updating contact: ' + error.message)
    }
    setLoading(false)
  }

  const loadContact = async () => {
    if (!activeWorkspaceId || !params.id) return

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .eq('workspace_id', activeWorkspaceId)
      .single()

    if (error) {
      console.error('Error loading contact:', error)
      router.push('/contacts')
    } else if (data) {
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
        company_id: data.company_id || '',
        new_company_name: '',
        remit_notes: data.remit_notes || '',
        taste_notes: data.taste_notes || '',
        additional_notes: data.additional_notes || '',
        tags: data.tags ? data.tags.join(', ') : ''
      })

      // Load existing selections
      const [mediumsRes, genresRes, budgetsRes] = await Promise.all([
        supabase.from('contact_mediums').select('medium_id').eq('contact_id', params.id),
        supabase.from('contact_genres').select('genre_id').eq('contact_id', params.id),
        supabase.from('contact_budget_ranges').select('budget_range_id').eq('contact_id', params.id)
      ])

      if (mediumsRes.data) {
        const mediumIds = mediumsRes.data.map(m => m.medium_id)
        setSelectedMediums(mediumIds)
      }
      if (genresRes.data) {
        const genreIds = genresRes.data.map(g => g.genre_id)
        setSelectedGenres(genreIds)
      }
      if (budgetsRes.data) {
        const budgetIds = budgetsRes.data.map(b => b.budget_range_id)
        setSelectedBudgetRanges(budgetIds)
      }

      // Set company search term for autocomplete
      if (data.companies?.name) {
        setCompanySearchTerm(data.companies.name)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const toggleMedium = (mediumId: number) => {
    setSelectedMediums(prev => {
      if (prev.includes(mediumId)) {
        // Remove and also clear related budget ranges
        const newMediums = prev.filter(id => id !== mediumId)
        if (newMediums.length === 0) {
          setSelectedBudgetRanges([])
        }
        return newMediums
      } else {
        return [...prev, mediumId]
      }
    })
  }

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }

  const toggleBudgetRange = (budgetId: number) => {
    setSelectedBudgetRanges(prev => 
      prev.includes(budgetId) 
        ? prev.filter(id => id !== budgetId)
        : [...prev, budgetId]
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanySearchTerm(e.target.value)
    // Clear selected company when typing
    setFormData(prev => ({ ...prev, company_id: '', new_company_name: e.target.value }))
  }

  const selectCompany = (company: Company) => {
    setFormData(prev => ({ ...prev, company_id: company.id, new_company_name: '' }))
    setCompanySearchTerm(company.name)
    setShowCompanyDropdown(false)
  }

  const handleCompanyInputFocus = () => {
    if (companySearchTerm && filteredCompanies.length > 0) {
      setShowCompanyDropdown(true)
    }
  }

  const handleCompanyInputBlur = () => {
    // Delay hiding dropdown to allow clicking on options
    setTimeout(() => setShowCompanyDropdown(false), 150)
  }

  return (
    <Layout>
      <div style={{ maxWidth: '768px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Edit Contact</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Update contact information for your workspace.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="first_name" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label htmlFor="last_name" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Company with Autocomplete */}
            <div style={{ position: 'relative' }}>
              <label htmlFor="company_search" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Company
              </label>
              <input
                type="text"
                id="company_search"
                value={companySearchTerm}
                onChange={handleCompanySearch}
                onFocus={handleCompanyInputFocus}
                onBlur={handleCompanyInputBlur}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                placeholder="Search for existing company or type new company name"
              />
              
              {/* Dropdown with search results */}
              {showCompanyDropdown && filteredCompanies.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  marginTop: '4px'
                }}>
                  {filteredCompanies.slice(0, 10).map((company) => (
                    <div
                      key={company.id}
                      onClick={() => selectCompany(company)}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                      }}
                    >
                      {company.name}
                    </div>
                  ))}
                </div>
              )}
              
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                {formData.company_id ? 'Selected existing company' : 'Type to search existing companies or enter new company name'}
              </p>
            </div>

            <div>
              <label htmlFor="role" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Role
              </label>
              <input
                type="text"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                placeholder="e.g., Producer, Director, Executive"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="phone" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="e.g., +44 20 7946 0958"
                />
              </div>

              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Mediums */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Mediums
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {mediums.map((medium) => (
                  <button
                    key={medium.id}
                    type="button"
                    onClick={() => toggleMedium(medium.id)}
                    style={selectedMediums.includes(medium.id) ? selectedPillStyle : pillButtonStyle}
                  >
                    {medium.name}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Select the types of projects this contact works with
              </p>
            </div>

            {/* Genres */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Genres
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    style={selectedGenres.includes(genre.id) ? selectedPillStyle : pillButtonStyle}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Select genres this contact is interested in
              </p>
            </div>

            {/* Budget Ranges */}
            {selectedMediums.length > 0 && budgetRanges.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Budget Ranges
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {budgetRanges.map((budget) => (
                    <button
                      key={budget.id}
                      type="button"
                      onClick={() => toggleBudgetRange(budget.id)}
                      style={selectedBudgetRanges.includes(budget.id) ? selectedPillStyle : pillButtonStyle}
                    >
                      {budget.label}
                    </button>
                  ))}
                </div>
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Select budget ranges this contact works with
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="remit_notes" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Remit Notes
              </label>
              <textarea
                id="remit_notes"
                name="remit_notes"
                rows={3}
                value={formData.remit_notes}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                placeholder="What types of projects they work on, their responsibilities..."
              />
            </div>

            <div>
              <label htmlFor="taste_notes" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Taste Notes
              </label>
              <textarea
                id="taste_notes"
                name="taste_notes"
                rows={3}
                value={formData.taste_notes}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                placeholder="Their preferences, style, past projects they've liked..."
              />
            </div>

            <div>
              <label htmlFor="additional_notes" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                name="additional_notes"
                rows={3}
                value={formData.additional_notes}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }}
                placeholder="Any other relevant information..."
              />
            </div>

            <div>
              <label htmlFor="tags" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                placeholder="Enter tags separated by commas (e.g., indie, documentary, horror)"
              />
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Separate multiple tags with commas
              </p>
              
              {/* Top 10 Most Used Tags */}
              {topTags.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Most used contact tags:</p>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading ? '0.5' : '1',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
{loading ? 'Updating...' : 'Update Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}