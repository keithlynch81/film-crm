'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  role: string | null
  remit_notes: string | null
  taste_notes: string | null
  additional_notes: string | null
  tags: string[] | null
  created_at: string
  companies: {
    name: string
  } | null
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

export default function ContactsPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'created_at' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (activeWorkspaceId) {
      loadContacts()
    }
  }, [activeWorkspaceId])

  const loadContacts = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies:company_id (
          name
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('first_name')

    if (error) {
      console.error('Error loading contacts:', error)
    } else {
      setContacts(data || [])
    }
    setLoading(false)
  }

  const handleSort = (field: 'name' | 'created_at') => {
    if (sortField === field) {
      // Same field clicked, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field clicked, start with ascending (or descending for created_at)
      setSortField(field)
      setSortDirection(field === 'created_at' ? 'desc' : 'asc')
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const search = searchTerm.toLowerCase()
    return (
      contact.first_name.toLowerCase().includes(search) ||
      contact.last_name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.role?.toLowerCase().includes(search) ||
      contact.companies?.name?.toLowerCase().includes(search) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(search))
    )
  })

  // Sort filtered contacts
  const sortedAndFilteredContacts = [...filteredContacts].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string | Date
    let bValue: string | Date
    
    if (sortField === 'name') {
      aValue = `${a.first_name} ${a.last_name || ''}`.toLowerCase()
      bValue = `${b.first_name} ${b.last_name || ''}`.toLowerCase()
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

  // CSV Export Function for Contacts
  const exportContactsCSV = async () => {
    if (contacts.length === 0) {
      alert('No contacts to export')
      return
    }

    // Get full contact data with all relationships for export
    const { data: fullContacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        companies:company_id (
          name
        ),
        contact_mediums (
          mediums (
            name
          )
        ),
        contact_genres (
          genres (
            name
          )
        ),
        contact_budget_ranges (
          budget_ranges (
            label
          )
        )
      `)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error fetching full contact data:', error)
      alert('Error exporting contacts')
      return
    }

    const csvHeaders = [
      'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'COMPANY', 'ROLE', 
      'MEDIUMS', 'GENRES', 'BUDGET_RANGES', 'TAGS', 'REMIT_NOTES', 'TASTE_NOTES', 'ADDITIONAL_NOTES'
    ]
    
    const csvRows = fullContacts.map(contact => {
      const mediums = contact.contact_mediums?.map(cm => cm.mediums.name).join(',') || ''
      const genres = contact.contact_genres?.map(cg => cg.genres.name).join(',') || ''
      const budgets = contact.contact_budget_ranges?.map(cbr => cbr.budget_ranges.label).join(',') || ''
      const tags = contact.tags?.join(',') || ''
      
      return [
        contact.first_name || '',
        contact.last_name || '',
        contact.email || '',
        contact.phone || '',
        contact.companies?.name || '',
        contact.role || '',
        mediums,
        genres,
        budgets,
        tags,
        contact.remit_notes || '',
        contact.taste_notes || '',
        contact.additional_notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`)
    })

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contacts-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CSV Upload Function for Contacts
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

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toUpperCase())
      
      // Validate required columns
      const requiredColumns = ['FIRST_NAME']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        alert(`Missing required columns: ${missingColumns.join(', ')}`)
        return
      }

      // Get reference data for matching
      const [mediumsRes, genresRes, budgetRangesRes, companiesRes] = await Promise.all([
        supabase.from('mediums').select('*'),
        supabase.from('genres').select('*'),
        supabase.from('budget_ranges').select('*'),
        supabase.from('companies').select('*').eq('workspace_id', activeWorkspaceId)
      ])

      const mediumsMap = new Map((mediumsRes.data || []).map(m => [m.name.toLowerCase(), m]))
      const genresMap = new Map((genresRes.data || []).map(g => [g.name.toLowerCase(), g]))
      const budgetRangesMap = new Map((budgetRangesRes.data || []).map(br => [br.label.toLowerCase(), br]))
      const companiesMap = new Map((companiesRes.data || []).map(c => [c.name.toLowerCase(), c]))

      const contactsToInsert = []

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i])
        if (values.length === 0) continue

        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].replace(/"/g, '').trim() : ''
        })

        if (!row.FIRST_NAME) continue

        // Handle company - create if doesn't exist
        let companyId = null
        if (row.COMPANY) {
          let company = companiesMap.get(row.COMPANY.toLowerCase())
          if (!company) {
            // Create new company
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert([{
                workspace_id: activeWorkspaceId,
                name: row.COMPANY
              }])
              .select()
              .single()

            if (!companyError && newCompany) {
              company = newCompany
              companiesMap.set(row.COMPANY.toLowerCase(), company)
            }
          }
          if (company) companyId = company.id
        }

        // Create contact data
        const contactData = {
          workspace_id: activeWorkspaceId,
          first_name: row.FIRST_NAME,
          last_name: row.LAST_NAME || null,
          email: row.EMAIL || null,
          phone: row.PHONE || null,
          company_id: companyId,
          role: row.ROLE || null,
          remit_notes: row.REMIT_NOTES || null,
          taste_notes: row.TASTE_NOTES || null,
          additional_notes: row.ADDITIONAL_NOTES || null,
          tags: row.TAGS ? row.TAGS.split(',').map(t => t.trim()).filter(t => t) : null
        }

        contactsToInsert.push({ 
          data: contactData, 
          mediums: row.MEDIUMS || '', 
          genres: row.GENRES || '', 
          budgetRanges: row.BUDGET_RANGES || ''
        })
      }

      if (contactsToInsert.length === 0) {
        alert('No valid contacts found in CSV file')
        return
      }

      // Insert contacts and get IDs
      for (const item of contactsToInsert) {
        const { data: contact, error } = await supabase
          .from('contacts')
          .insert([item.data])
          .select()
          .single()

        if (error) {
          console.error('Error inserting contact:', error)
          continue
        }

        // Handle mediums
        if (item.mediums) {
          const mediumNames = item.mediums.split(',').map(m => m.trim()).filter(m => m)
          for (const mediumName of mediumNames) {
            const medium = mediumsMap.get(mediumName.toLowerCase())
            if (medium) {
              await supabase.from('contact_mediums').insert({
                contact_id: contact.id,
                medium_id: medium.id
              })
            }
          }
        }

        // Handle genres
        if (item.genres) {
          const genreNames = item.genres.split(',').map(g => g.trim()).filter(g => g)
          for (const genreName of genreNames) {
            const genre = genresMap.get(genreName.toLowerCase())
            if (genre) {
              await supabase.from('contact_genres').insert({
                contact_id: contact.id,
                genre_id: genre.id
              })
            }
          }
        }

        // Handle budget ranges
        if (item.budgetRanges) {
          const budgetRangeLabels = item.budgetRanges.split(',').map(br => br.trim()).filter(br => br)
          for (const budgetRangeLabel of budgetRangeLabels) {
            const budgetRange = budgetRangesMap.get(budgetRangeLabel.toLowerCase())
            if (budgetRange) {
              await supabase.from('contact_budget_ranges').insert({
                contact_id: contact.id,
                budget_range_id: budgetRange.id
              })
            }
          }
        }
      }

      alert(`Successfully imported ${contactsToInsert.length} contacts`)
      setUploadFile(null)
      setShowUpload(false)
      loadContacts() // Refresh the list
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Error uploading CSV: ' + error.message)
    }
    setUploading(false)
  }

  // Helper function to parse CSV rows properly
  const parseCSVRow = (row) => {
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
            <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>Contacts</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Manage your industry contacts and relationships.
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
              onClick={exportContactsCSV}
              style={{
                ...buttonStyle,
                background: '#6366f1',
                color: '#ffffff',
              }}
            >
              Export CSV
            </button>
            <Link
              href="/contacts/new"
              style={primaryButtonStyle}
            >
              Add Contact
            </Link>
          </div>
        </div>

        {/* CSV Upload Form */}
        {showUpload && (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Upload Contacts CSV
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>
                Upload a CSV file with columns: FIRST_NAME, LAST_NAME, EMAIL, PHONE, COMPANY, ROLE, MEDIUMS, GENRES, BUDGET_RANGES, TAGS, REMIT_NOTES, TASTE_NOTES, ADDITIONAL_NOTES
              </p>
              <ul style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', paddingLeft: '20px' }}>
                <li>FIRST_NAME is required for each row</li>
                <li>Companies will be created automatically if they don't exist</li>
                <li>Multiple mediums and budget ranges should be separated by commas (,)</li>
                <li>Multiple genres and tags should be separated by commas (,)</li>
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
                  {uploading ? 'Uploading...' : 'Upload Contacts'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ maxWidth: '384px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Search Contacts
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, company, role, or tags..."
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

        {/* Contacts Grid */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          {sortedAndFilteredContacts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
              {contacts.length === 0 ? (
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>No contacts yet.</p>
                  <Link
                    href="/contacts/new"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    Add your first contact
                  </Link>
                </div>
              ) : (
                <p style={{ margin: 0 }}>No contacts match your search.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1px', background: '#e5e7eb' }}>
              {/* Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1.5fr 2fr 1fr 60px', 
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
                  onClick={() => handleSort('name')}
                  style={{ 
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#4f46e5'
                  }}
                >
                  Name
                  {sortField === 'name' && (
                    <span style={{ fontSize: '10px' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
                <div>Company</div>
                <div>Email</div>
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
              {sortedAndFilteredContacts.map((contact) => (
                <div 
                  key={contact.id} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1.5fr 2fr 1fr 60px', 
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
                      href={`/contacts/${contact.id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
                    >
                      {contact.first_name} {contact.last_name}
                    </Link>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    {contact.companies?.name || '—'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {contact.email || '—'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-GB') : '—'}
                  </div>
                  <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Link
                      href={`/contacts/${contact.id}`}
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