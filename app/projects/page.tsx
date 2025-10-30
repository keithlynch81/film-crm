'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Box,
  Button,
  Input,
  Flex,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Spinner,
  Center,
  Collapse,
  Heading,
  Wrap,
  WrapItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Badge,
  Grid,
  GridItem,
  Select,
  Tooltip
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
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
  pinned: boolean
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

// Style constants removed - now using Chakra UI components

export default function ProjectsPage() {
  const router = useRouter()
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
      .order('pinned', { ascending: false })
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

  const togglePin = async (projectId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('projects')
      .update({ pinned: !currentPinned })
      .eq('id', projectId)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error toggling pin:', error)
    } else {
      // Update local state immediately for better UX
      setProjects(prevProjects => {
        const updated = prevProjects.map(p =>
          p.id === projectId ? { ...p, pinned: !currentPinned } : p
        )
        // Sort to move pinned items to top
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      })
    }
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

  // Sort filtered projects - always keep pinned items at the top
  const sortedAndFilteredProjects = [...filteredProjects].sort((a, b) => {
    // First, sort by pinned status
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1

    // Then apply user sorting if set
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

  if (loading) {
    return (
      <Layout>
        <Center h="64">
          <Spinner size="lg" color="blue.500" />
        </Center>
      </Layout>
    )
  }

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} gap={{ base: 4, md: 0 }}>
          <Box>
            <Heading size="xl" color="gray.800" mb={2}>Projects</Heading>
            <Text fontSize="sm" color="gray.600">
              Manage your film projects and track submissions.
            </Text>
          </Box>
          <Flex gap={3} align="center">
            {/* Icon buttons for Upload/Export - hidden on mobile */}
            <Box display={{ base: "none", md: "flex" }} gap={2}>
              <Tooltip label="Upload CSV" placement="bottom">
                <IconButton
                  icon={
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  }
                  aria-label="Upload CSV"
                  onClick={() => router.push('/projects/upload')}
                  colorScheme="gray"
                  variant="outline"
                  size="md"
                />
              </Tooltip>
              <Tooltip label="Export CSV" placement="bottom">
                <IconButton
                  icon={
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  }
                  aria-label="Export CSV"
                  onClick={exportProjectsCSV}
                  colorScheme="gray"
                  variant="outline"
                  size="md"
                />
              </Tooltip>
            </Box>
            {/* Add Project button - always visible, full width on mobile */}
            <Button
              as={Link}
              href="/projects/new"
              colorScheme="blue"
              size="md"
              w={{ base: "full", md: "auto" }}
            >
              Add Project
            </Button>
          </Flex>
        </Flex>

        {/* Search and Filters */}
        <Card>
          <CardBody>
            {/* Search Bar */}
            <Flex gap={4} align="end" mb={showFilters ? 6 : 0}>
              <Box flex={1} maxW="384px">
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Search Projects
                </Text>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, logline, or tags..."
                  size="md"
                />
              </Box>
              
              <Flex gap={3}>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  colorScheme={showFilters ? "blue" : "gray"}
                  variant={showFilters ? "solid" : "outline"}
                  size="md"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                
                {hasActiveFilters && (
                  <Button
                    onClick={clearAllFilters}
                    colorScheme="red"
                    variant="outline"
                    size="md"
                  >
                    Clear All
                  </Button>
                )}
              </Flex>
            </Flex>

            {/* Advanced Filters */}
            <Collapse in={showFilters}>
              <Box borderTop="1px" borderColor="gray.200" pt={6}>
                <VStack align="stretch" spacing={5}>
                  {/* Medium Filter */}
                  {mediums.length > 0 && (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Medium ({selectedMediums.length} selected)
                      </Text>
                      <Wrap spacing={2}>
                        {mediums.map((medium) => (
                          <WrapItem key={medium.id}>
                            <Button
                              onClick={() => toggleMedium(medium.name)}
                              colorScheme={selectedMediums.includes(medium.name) ? "blue" : "gray"}
                              variant={selectedMediums.includes(medium.name) ? "solid" : "outline"}
                              size="sm"
                              borderRadius="full"
                            >
                              {medium.name}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Genres Filter */}
                  {genres.length > 0 && (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Genres ({selectedGenres.length} selected)
                      </Text>
                      <Wrap spacing={2}>
                        {genres.map((genre) => (
                          <WrapItem key={genre.id}>
                            <Button
                              onClick={() => toggleGenre(genre.name)}
                              colorScheme={selectedGenres.includes(genre.name) ? "blue" : "gray"}
                              variant={selectedGenres.includes(genre.name) ? "solid" : "outline"}
                              size="sm"
                              borderRadius="full"
                            >
                              {genre.name}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Tags Filter */}
                  {uniqueTags.length > 0 && (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Tags ({selectedTags.length} selected)
                      </Text>
                      <Wrap spacing={2}>
                        {uniqueTags.map((tag) => (
                          <WrapItem key={tag}>
                            <Button
                              onClick={() => toggleTag(tag)}
                              colorScheme={selectedTags.includes(tag) ? "blue" : "gray"}
                              variant={selectedTags.includes(tag) ? "solid" : "outline"}
                              size="sm"
                              borderRadius="full"
                            >
                              #{tag}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Status and Stage Filters */}
                  <Grid templateColumns="1fr 1fr" gap={4}>
                    {/* Status Filter */}
                    {uniqueStatuses.length > 0 && (
                      <GridItem>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                          Status
                        </Text>
                        <Select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          size="md"
                        >
                          <option value="">All Statuses</option>
                          {uniqueStatuses.map((status) => (
                            <option key={status} value={status || ''}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </GridItem>
                    )}

                    {/* Stage Filter */}
                    {uniqueStages.length > 0 && (
                      <GridItem>
                        <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                          Stage
                        </Text>
                        <Select
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                          size="md"
                        >
                          <option value="">All Stages</option>
                          {uniqueStages.map((stage) => (
                            <option key={stage} value={stage || ''}>
                              {stage}
                            </option>
                          ))}
                        </Select>
                      </GridItem>
                    )}
                  </Grid>

                  {/* Results Summary */}
                  <Box p={3} bg="gray.50" borderRadius="md" fontSize="sm" color="gray.600">
                    <Text>
                      Showing {sortedAndFilteredProjects.length} of {projects.length} projects
                      {hasActiveFilters && (
                        <Text as="span" color="blue.500" ml={2}>
                          (filtered)
                        </Text>
                      )}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </Collapse>
          </CardBody>
        </Card>

        {/* Projects Grid */}
        <Card>
          {sortedAndFilteredProjects.length === 0 ? (
            <CardBody>
              <Center py={12}>
                <VStack spacing={2}>
                  {projects.length === 0 ? (
                    <>
                      <Text color="gray.600" mb={2}>No projects yet.</Text>
                      <Text as={Link} href="/projects/new" color="blue.500" textDecoration="none">
                        Create your first project
                      </Text>
                    </>
                  ) : (
                    <Text color="gray.600">No projects match your current filters.</Text>
                  )}
                </VStack>
              </Center>
            </CardBody>
          ) : (
            <CardBody>
              {/* Mobile Card Layout */}
              <Box display={{ base: "block", md: "none" }}>
                <VStack spacing={3} align="stretch">
                  {sortedAndFilteredProjects.map((project) => (
                    <Card key={project.id} size="sm">
                      <CardBody>
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between" align="start">
                            <HStack spacing={2} flex="1" pr={2}>
                              <IconButton
                                icon={
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill={project.pinned ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                  </svg>
                                }
                                aria-label={project.pinned ? "Unpin project" : "Pin project"}
                                size="sm"
                                variant="ghost"
                                colorScheme={project.pinned ? "yellow" : "gray"}
                                onClick={(e) => {
                                  e.preventDefault()
                                  togglePin(project.id, project.pinned)
                                }}
                              />
                              <Text as={Link} href={`/projects/${project.id}`} color="blue.500" fontWeight="medium" fontSize="md" _hover={{ textDecoration: "underline" }} flex="1">
                                {project.title}
                              </Text>
                            </HStack>
                            {project.project_genres && project.project_genres.length > 0 && (
                              <Badge colorScheme="purple" borderRadius="full" fontSize="xs" flexShrink={0}>
                                {project.project_genres[0].genres.name}
                              </Badge>
                            )}
                          </Flex>
                          {project.logline && (
                            <Text fontSize="sm" color="gray.600" noOfLines={2} wordBreak="break-word">
                              {project.logline}
                            </Text>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>

              {/* Desktop Table Layout */}
              <TableContainer display={{ base: "none", md: "block" }} overflowX="auto">
                <Table variant="simple" size="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <Thead bg="gray.50">
                    <Tr>
                    <Th width="50px"></Th>
                    <Th
                      fontSize="xs"
                      fontWeight="medium"
                      color="indigo.600"
                      textTransform="uppercase"
                      letterSpacing="wide"
                      cursor="pointer"
                      onClick={() => handleSort('title')}
                      _hover={{ bg: "gray.100" }}
                    >
                      <HStack spacing={1}>
                        <Text>Title</Text>
                        {sortField === 'title' && (
                          <Text fontSize="xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Text>
                        )}
                      </HStack>
                    </Th>
                    <Th
                      fontSize="xs"
                      fontWeight="medium"
                      color="indigo.600"
                      textTransform="uppercase"
                      letterSpacing="wide"
                      cursor="pointer"
                      onClick={() => handleSort('created_at')}
                      _hover={{ bg: "gray.100" }}
                      width="180px"
                    >
                      <HStack spacing={1}>
                        <Text>Date Added</Text>
                        {sortField === 'created_at' && (
                          <Text fontSize="xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Text>
                        )}
                      </HStack>
                    </Th>
                    <Th width="60px"></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedAndFilteredProjects.map((project) => (
                    <Tr key={project.id} _hover={{ bg: "gray.50" }}>
                      <Td>
                        <IconButton
                          icon={
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill={project.pinned ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                          }
                          aria-label={project.pinned ? "Unpin project" : "Pin project"}
                          size="sm"
                          variant="ghost"
                          colorScheme={project.pinned ? "yellow" : "gray"}
                          onClick={(e) => {
                            e.preventDefault()
                            togglePin(project.id, project.pinned)
                          }}
                        />
                      </Td>
                      <Td>
                        <VStack align="start" spacing={2} w="100%">
                          <HStack spacing={2} align="center" flexWrap="wrap">
                            <Text as={Link} href={`/projects/${project.id}`} color="blue.500" fontWeight="medium" fontSize="sm" _hover={{ textDecoration: "underline" }}>
                              {project.title}
                            </Text>
                            {project.project_genres && project.project_genres.length > 0 && (
                              <HStack spacing={1}>
                                {project.project_genres.slice(0, 3).map((pg, index) => (
                                  <Badge key={index} colorScheme="purple" borderRadius="full" fontSize="xs">
                                    {pg.genres.name}
                                  </Badge>
                                ))}
                                {project.project_genres.length > 3 && (
                                  <Text fontSize="xs" color="gray.600">
                                    +{project.project_genres.length - 3}
                                  </Text>
                                )}
                              </HStack>
                            )}
                            {project.tags && project.tags.length > 0 && (
                              <HStack spacing={1}>
                                {project.tags.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} colorScheme="gray" borderRadius="full" fontSize="xs">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Badge>
                                ))}
                              </HStack>
                            )}
                          </HStack>
                          {project.logline && (
                            <div
                              style={{
                                fontSize: '14px',
                                color: '#374151',
                                lineHeight: '1.4',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                width: '100%',
                                display: 'block'
                              }}
                            >
                              {project.logline}
                            </div>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={2}>
                          {project.status && (
                            <Badge colorScheme="green" borderRadius="full" fontSize="xs">
                              {project.status}
                            </Badge>
                          )}
                          <Text fontSize="sm" color="gray.600">
                            {new Date(project.created_at).toLocaleDateString('en-GB')}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <IconButton
                          as={Link}
                          href={`/projects/${project.id}`}
                          icon={
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
                          }
                          aria-label="View project"
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
            </CardBody>
          )}
        </Card>
      </VStack>
    </Layout>
  )
}