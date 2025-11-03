'use client'

import { useState, useEffect } from 'react'
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
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Badge,
  Select,
  Wrap,
  WrapItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea,
  FormControl,
  FormLabel,
  useDisclosure,
  Image,
  Link as ChakraLink
} from '@chakra-ui/react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type LinkItem = {
  id: string
  workspace_id: string
  url: string
  title: string | null
  description: string | null
  favicon_url: string | null
  preview_image_url: string | null
  tags: string[] | null
  created_at: string
  created_by: string | null
  updated_at: string
  project_links: { projects: { id: string, title: string } }[]
  link_genres: { genres: { id: number, name: string } }[]
}

type Project = {
  id: string
  title: string
}

type Genre = {
  id: number
  name: string
}

export default function LinksPage() {
  const { activeWorkspaceId, user } = useWorkspace()
  const [links, setLinks] = useState<LinkItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  // Quick-add form
  const [quickUrl, setQuickUrl] = useState('')
  const [quickTags, setQuickTags] = useState('')
  const [quickSelectedTags, setQuickSelectedTags] = useState<string[]>([])
  const [quickProjectIds, setQuickProjectIds] = useState<string[]>([])
  const [quickGenreIds, setQuickGenreIds] = useState<number[]>([])
  const [showQuickTagSuggestions, setShowQuickTagSuggestions] = useState(false)

  // Edit modal tag autocomplete
  const [showEditTagSuggestions, setShowEditTagSuggestions] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('')
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Edit modal
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [editFormData, setEditFormData] = useState({
    url: '',
    title: '',
    description: '',
    tags: '',
    favicon_url: '',
    preview_image_url: '',
    projectIds: [] as string[],
    genreIds: [] as number[]
  })

  useEffect(() => {
    if (activeWorkspaceId) {
      loadLinks()
      loadProjects()
      loadGenres()
    }
  }, [activeWorkspaceId])

  const loadLinks = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('links')
      .select(`
        *,
        project_links(
          projects(id, title)
        ),
        link_genres(
          genres(id, name)
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading links:', error)
    } else {
      setLinks(data || [])
    }
    setLoading(false)
  }

  const loadProjects = async () => {
    if (!activeWorkspaceId) return

    const { data, error} = await supabase
      .from('projects')
      .select('id, title')
      .eq('workspace_id', activeWorkspaceId)
      .order('title')

    if (error) {
      console.error('Error loading projects:', error)
    } else {
      setProjects(data || [])
    }
  }

  const loadGenres = async () => {
    const { data, error } = await supabase
      .from('genres')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error loading genres:', error)
    } else {
      setGenres(data || [])
    }
  }

  const handleQuickAdd = async () => {
    if (!quickUrl || !activeWorkspaceId || !user) return

    setAdding(true)
    try {
      // Parse tags from text input (normalize to lowercase for consistency)
      const typedTags = quickTags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)

      // Combine selected tags with typed tags (remove duplicates)
      const allTags = Array.from(new Set([...quickSelectedTags, ...typedTags]))

      // Try to fetch page title and favicon
      let title = null
      let faviconUrl = null
      try {
        console.log('Fetching metadata for:', quickUrl)
        const response = await fetch(`/api/fetch-link-metadata?url=${encodeURIComponent(quickUrl)}`)
        console.log('Metadata fetch response status:', response.status)
        if (response.ok) {
          const metadata = await response.json()
          console.log('Metadata received:', metadata)
          title = metadata.title
          faviconUrl = metadata.favicon_url
        } else {
          const errorData = await response.json()
          console.warn('Metadata fetch failed:', response.status, errorData.error)
        }
      } catch (e) {
        // If metadata fetch fails, continue without it
        console.error('Could not fetch metadata:', e)
      }

      // Create link
      const { data: link, error: linkError } = await supabase
        .from('links')
        .insert([{
          workspace_id: activeWorkspaceId,
          url: quickUrl,
          title: title,
          favicon_url: faviconUrl,
          tags: allTags.length > 0 ? allTags : null,
          created_by: user.id
        }])
        .select()
        .single()

      if (linkError) throw linkError

      // Associate with projects if selected
      if (quickProjectIds.length > 0 && link) {
        const { error: junctionError } = await supabase
          .from('project_links')
          .insert(
            quickProjectIds.map(projectId => ({
              project_id: projectId,
              link_id: link.id
            }))
          )

        if (junctionError) throw junctionError
      }

      // Associate with genres if selected
      if (quickGenreIds.length > 0 && link) {
        const { error: genreError } = await supabase
          .from('link_genres')
          .insert(
            quickGenreIds.map(genreId => ({
              link_id: link.id,
              genre_id: genreId
            }))
          )

        if (genreError) throw genreError
      }

      // Reset form
      setQuickUrl('')
      setQuickTags('')
      setQuickSelectedTags([])
      setQuickProjectIds([])
      setQuickGenreIds([])

      // Reload links
      loadLinks()
    } catch (error: any) {
      console.error('Error adding link:', error)
      alert('Error adding link: ' + error.message)
    }
    setAdding(false)
  }

  const openEditModal = (link: LinkItem) => {
    setEditingLink(link)
    setEditFormData({
      url: link.url,
      title: link.title || '',
      description: link.description || '',
      tags: link.tags?.join(', ') || '',
      favicon_url: link.favicon_url || '',
      preview_image_url: link.preview_image_url || '',
      projectIds: link.project_links?.map(pl => pl.projects.id) || [],
      genreIds: link.link_genres?.map(lg => lg.genres.id) || []
    })
    onOpen()
  }

  const handleSaveEdit = async () => {
    if (!editingLink) return

    try {
      // Parse tags (normalize to lowercase for consistency)
      const tags = editFormData.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)

      // Update link
      const { error: updateError } = await supabase
        .from('links')
        .update({
          url: editFormData.url,
          title: editFormData.title || null,
          description: editFormData.description || null,
          tags: tags.length > 0 ? tags : null,
          favicon_url: editFormData.favicon_url || null,
          preview_image_url: editFormData.preview_image_url || null
        })
        .eq('id', editingLink.id)

      if (updateError) throw updateError

      // Update project associations
      // First, delete all existing associations
      await supabase
        .from('project_links')
        .delete()
        .eq('link_id', editingLink.id)

      // Then, insert new associations
      if (editFormData.projectIds.length > 0) {
        const { error: junctionError } = await supabase
          .from('project_links')
          .insert(
            editFormData.projectIds.map(projectId => ({
              project_id: projectId,
              link_id: editingLink.id
            }))
          )

        if (junctionError) throw junctionError
      }

      // Update genre associations
      // First, delete all existing associations
      await supabase
        .from('link_genres')
        .delete()
        .eq('link_id', editingLink.id)

      // Then, insert new associations
      if (editFormData.genreIds.length > 0) {
        const { error: genreError } = await supabase
          .from('link_genres')
          .insert(
            editFormData.genreIds.map(genreId => ({
              link_id: editingLink.id,
              genre_id: genreId
            }))
          )

        if (genreError) throw genreError
      }

      onClose()
      loadLinks()
    } catch (error: any) {
      console.error('Error updating link:', error)
      alert('Error updating link: ' + error.message)
    }
  }

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)

      if (error) throw error

      loadLinks()
    } catch (error: any) {
      console.error('Error deleting link:', error)
      alert('Error deleting link: ' + error.message)
    }
  }

  const toggleProjectAssociation = (projectId: string) => {
    setEditFormData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }))
  }

  const toggleGenreAssociation = (genreId: number) => {
    setEditFormData(prev => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter(id => id !== genreId)
        : [...prev.genreIds, genreId]
    }))
  }

  const toggleQuickGenre = (genreId: number) => {
    setQuickGenreIds(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }

  const toggleQuickTag = (tag: string) => {
    setQuickSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const toggleQuickProject = (projectId: string) => {
    setQuickProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  // Get unique tags for filtering
  const uniqueTags = Array.from(new Set(
    links
      .flatMap(link => link.tags || [])
      .filter(Boolean)
  )).sort()

  // Get tag suggestions based on current input
  const getTagSuggestions = (input: string) => {
    if (!input) return []

    // Get the last tag being typed (after the last comma)
    const tags = input.split(',')
    const currentTag = tags[tags.length - 1].trim().toLowerCase()

    if (!currentTag) return []

    // Filter existing tags that start with the current input
    return uniqueTags.filter(tag =>
      tag.toLowerCase().startsWith(currentTag) &&
      tag.toLowerCase() !== currentTag
    )
  }

  const handleQuickTagSelect = (suggestion: string) => {
    const tags = quickTags.split(',').map(t => t.trim())
    tags[tags.length - 1] = suggestion
    setQuickTags(tags.join(', ') + ', ')
    setShowQuickTagSuggestions(false)
  }

  const handleEditTagSelect = (suggestion: string) => {
    const tags = editFormData.tags.split(',').map(t => t.trim())
    tags[tags.length - 1] = suggestion
    setEditFormData(prev => ({ ...prev, tags: tags.join(', ') + ', ' }))
    setShowEditTagSuggestions(false)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const toggleGenreFilter = (genreId: number) => {
    setSelectedGenreFilter(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }

  const clearAllFilters = () => {
    setSelectedTags([])
    setSelectedProjectFilter('')
    setSelectedGenreFilter([])
    setSearchTerm('')
  }

  // Filter links
  const filteredLinks = links.filter(link => {
    // Search filter
    const search = searchTerm.toLowerCase()
    const matchesSearch = !search || (
      link.url.toLowerCase().includes(search) ||
      link.title?.toLowerCase().includes(search) ||
      link.description?.toLowerCase().includes(search) ||
      link.tags?.some(tag => tag.toLowerCase().includes(search))
    )

    // Tag filter
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => link.tags?.includes(tag))

    // Project filter
    const matchesProject = !selectedProjectFilter ||
      link.project_links?.some(pl => pl.projects.id === selectedProjectFilter)

    // Genre filter
    const matchesGenre = selectedGenreFilter.length === 0 ||
      selectedGenreFilter.some(genreId => link.link_genres?.some(lg => lg.genres.id === genreId))

    return matchesSearch && matchesTags && matchesProject && matchesGenre
  })

  const hasActiveFilters = selectedTags.length > 0 || selectedProjectFilter || selectedGenreFilter.length > 0 || searchTerm

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
        {/* Header */}
        <Box>
          <Heading size="xl" color="gray.800" mb={2}>Links</Heading>
          <Text fontSize="sm" color="gray.600">
            Save and organize useful URLs with tags and project associations.
          </Text>
        </Box>

        {/* Quick Add Form */}
        <Card>
          <CardBody>
            <Heading size="md" color="gray.800" mb={4}>
              Add New Link
            </Heading>
            <VStack spacing={4} align="stretch">
              {/* URL Field */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  URL
                </FormLabel>
                <Input
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  placeholder="https://example.com"
                  size="md"
                />
              </FormControl>

              {/* Tags Selection (Pill Buttons) */}
              {uniqueTags.length > 0 && (
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Tags ({quickSelectedTags.length} selected)
                  </FormLabel>
                  <Wrap spacing={2}>
                    {uniqueTags.map(tag => (
                      <WrapItem key={tag}>
                        <Button
                          onClick={() => toggleQuickTag(tag)}
                          colorScheme={quickSelectedTags.includes(tag) ? "purple" : "gray"}
                          variant={quickSelectedTags.includes(tag) ? "solid" : "outline"}
                          size="sm"
                          borderRadius="full"
                        >
                          {tag}
                        </Button>
                      </WrapItem>
                    ))}
                  </Wrap>
                </FormControl>
              )}

              {/* New Tags Input */}
              <FormControl position="relative">
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Add New Tags
                </FormLabel>
                <Input
                  value={quickTags}
                  onChange={(e) => {
                    setQuickTags(e.target.value)
                    setShowQuickTagSuggestions(true)
                  }}
                  onFocus={() => setShowQuickTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowQuickTagSuggestions(false), 200)}
                  placeholder="tag1, tag2"
                  size="md"
                />
                {showQuickTagSuggestions && getTagSuggestions(quickTags).length > 0 && (
                  <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    mt={1}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    boxShadow="lg"
                    maxH="200px"
                    overflowY="auto"
                    zIndex={1000}
                  >
                    {getTagSuggestions(quickTags).map((suggestion, index) => (
                      <Box
                        key={index}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "blue.50" }}
                        fontSize="sm"
                        onClick={() => handleQuickTagSelect(suggestion)}
                      >
                        {suggestion}
                      </Box>
                    ))}
                  </Box>
                )}
              </FormControl>

              {/* Projects Selection (Checkboxes) */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Associated Projects ({quickProjectIds.length} selected)
                </FormLabel>
                <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md" p={3}>
                  {projects.map(project => (
                    <Box
                      key={project.id}
                      as="label"
                      display="flex"
                      alignItems="center"
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                      p={2}
                      borderRadius="md"
                    >
                      <input
                        type="checkbox"
                        checked={quickProjectIds.includes(project.id)}
                        onChange={() => toggleQuickProject(project.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <Text fontSize="sm">{project.title}</Text>
                    </Box>
                  ))}
                </VStack>
              </FormControl>

              {/* Genres Selection (Pill Buttons) */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Genres ({quickGenreIds.length} selected)
                </FormLabel>
                <Wrap spacing={2}>
                  {genres.map(genre => (
                    <WrapItem key={genre.id}>
                      <Button
                        onClick={() => toggleQuickGenre(genre.id)}
                        colorScheme={quickGenreIds.includes(genre.id) ? "green" : "gray"}
                        variant={quickGenreIds.includes(genre.id) ? "solid" : "outline"}
                        size="sm"
                        borderRadius="full"
                      >
                        {genre.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>

              {/* Add Link Button */}
              <Button
                onClick={handleQuickAdd}
                isDisabled={!quickUrl || adding}
                isLoading={adding}
                colorScheme="blue"
                size="md"
                alignSelf="flex-start"
              >
                Add Link
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Filters */}
        <Card>
          <CardBody>
            <Flex
              justify="space-between"
              align="center"
              cursor="pointer"
              onClick={() => setShowFilters(!showFilters)}
              mb={showFilters ? 4 : 0}
            >
              <Heading size="md" color="gray.800">
                Search & Filters
                {hasActiveFilters && (
                  <Badge ml={2} colorScheme="blue" fontSize="xs">
                    {filteredLinks.length} of {links.length}
                  </Badge>
                )}
              </Heading>
              <Text fontSize="lg" color="gray.600" transition="transform 0.2s">
                {showFilters ? '▲' : '▼'}
              </Text>
            </Flex>

            {showFilters && (
              <VStack align="stretch" spacing={4}>
                <Flex gap={4} direction={{ base: "column", md: "row" }}>
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Search
                    </FormLabel>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search links, titles, descriptions..."
                      size="md"
                    />
                  </FormControl>

                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Filter by Project
                    </FormLabel>
                    <Select
                      value={selectedProjectFilter}
                      onChange={(e) => setSelectedProjectFilter(e.target.value)}
                      size="md"
                    >
                      <option value="">All Projects</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </Flex>

                {uniqueTags.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Filter by Tags ({selectedTags.length} selected)
                    </Text>
                    <Wrap spacing={2}>
                      {uniqueTags.map(tag => (
                        <WrapItem key={tag}>
                          <Button
                            onClick={() => toggleTag(tag)}
                            colorScheme={selectedTags.includes(tag) ? "blue" : "gray"}
                            variant={selectedTags.includes(tag) ? "solid" : "outline"}
                            size="sm"
                            borderRadius="full"
                          >
                            {tag}
                          </Button>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}

                {genres.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Filter by Genres ({selectedGenreFilter.length} selected)
                    </Text>
                    <Wrap spacing={2}>
                      {genres.map(genre => (
                        <WrapItem key={genre.id}>
                          <Button
                            onClick={() => toggleGenreFilter(genre.id)}
                            colorScheme={selectedGenreFilter.includes(genre.id) ? "green" : "gray"}
                            variant={selectedGenreFilter.includes(genre.id) ? "solid" : "outline"}
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

                {hasActiveFilters && (
                  <Flex justify="space-between" align="center" p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.600">
                      Showing {filteredLinks.length} of {links.length} links
                    </Text>
                    <Button
                      onClick={clearAllFilters}
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                    >
                      Clear All Filters
                    </Button>
                  </Flex>
                )}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Links Table */}
        <Card>
          <CardBody>
            {filteredLinks.length === 0 ? (
              <Center py={12}>
                <VStack spacing={2}>
                  <Text color="gray.600">
                    {links.length === 0 ? 'No links yet.' : 'No links match your current filters.'}
                  </Text>
                </VStack>
              </Center>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th width="50px"></Th>
                      <Th fontSize="xs" fontWeight="medium" color="indigo.600" textTransform="uppercase" letterSpacing="wide">
                        Link
                      </Th>
                      <Th fontSize="xs" fontWeight="medium" color="indigo.600" textTransform="uppercase" letterSpacing="wide">
                        Tags
                      </Th>
                      <Th fontSize="xs" fontWeight="medium" color="indigo.600" textTransform="uppercase" letterSpacing="wide">
                        Genres
                      </Th>
                      <Th fontSize="xs" fontWeight="medium" color="indigo.600" textTransform="uppercase" letterSpacing="wide">
                        Projects
                      </Th>
                      <Th fontSize="xs" fontWeight="medium" color="indigo.600" textTransform="uppercase" letterSpacing="wide">
                        Added
                      </Th>
                      <Th width="100px"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredLinks.map(link => (
                      <Tr key={link.id} _hover={{ bg: "gray.50" }}>
                        <Td>
                          {link.favicon_url ? (
                            <Image
                              src={link.favicon_url}
                              alt=""
                              boxSize="16px"
                              objectFit="contain"
                              onError={(e) => {
                                // Hide broken images
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <Box boxSize="16px" bg="gray.300" borderRadius="sm" />
                          )}
                        </Td>
                        <Td maxW="400px">
                          <VStack align="start" spacing={1}>
                            <ChakraLink
                              href={link.url}
                              isExternal
                              color="blue.500"
                              fontWeight="medium"
                              fontSize="sm"
                              _hover={{ textDecoration: "underline" }}
                              noOfLines={1}
                              display="block"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              {link.title || link.url}
                            </ChakraLink>
                            {link.description && (
                              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                {link.description}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          {link.tags && link.tags.length > 0 && (
                            <Wrap spacing={1}>
                              {link.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} colorScheme="purple" borderRadius="full" fontSize="xs">
                                  {tag}
                                </Badge>
                              ))}
                              {link.tags.length > 3 && (
                                <Text fontSize="xs" color="gray.600">
                                  +{link.tags.length - 3}
                                </Text>
                              )}
                            </Wrap>
                          )}
                        </Td>
                        <Td>
                          {link.link_genres && link.link_genres.length > 0 && (
                            <Wrap spacing={1}>
                              {link.link_genres.slice(0, 2).map((lg, index) => (
                                <Badge key={index} colorScheme="green" borderRadius="full" fontSize="xs">
                                  {lg.genres.name}
                                </Badge>
                              ))}
                              {link.link_genres.length > 2 && (
                                <Text fontSize="xs" color="gray.600">
                                  +{link.link_genres.length - 2}
                                </Text>
                              )}
                            </Wrap>
                          )}
                        </Td>
                        <Td>
                          {link.project_links && link.project_links.length > 0 ? (
                            <VStack align="start" spacing={0}>
                              {link.project_links.slice(0, 2).map((pl, index) => (
                                <ChakraLink
                                  key={index}
                                  as={Link}
                                  href={`/projects/${pl.projects.id}`}
                                  fontSize="xs"
                                  color="blue.500"
                                  _hover={{ textDecoration: "underline" }}
                                >
                                  {pl.projects.title}
                                </ChakraLink>
                              ))}
                              {link.project_links.length > 2 && (
                                <Text fontSize="xs" color="gray.600">
                                  +{link.project_links.length - 2} more
                                </Text>
                              )}
                            </VStack>
                          ) : (
                            <Text fontSize="xs" color="gray.500">—</Text>
                          )}
                        </Td>
                        <Td>
                          <Text fontSize="xs" color="gray.600">
                            {new Date(link.created_at).toLocaleDateString('en-GB')}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <IconButton
                              icon={
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              }
                              aria-label="Edit link"
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => openEditModal(link)}
                            />
                            <IconButton
                              icon={
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              }
                              aria-label="Delete link"
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(link.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Link</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">URL</FormLabel>
                <Input
                  value={editFormData.url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Title</FormLabel>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Auto-fetched or custom title"
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add notes about this link..."
                  rows={3}
                  size="md"
                />
              </FormControl>

              <FormControl position="relative">
                <FormLabel fontSize="sm">Tags (comma-separated)</FormLabel>
                <Input
                  value={editFormData.tags}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, tags: e.target.value }))
                    setShowEditTagSuggestions(true)
                  }}
                  onFocus={() => setShowEditTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowEditTagSuggestions(false), 200)}
                  placeholder="cinematography, lighting, reference"
                  size="md"
                />
                {showEditTagSuggestions && getTagSuggestions(editFormData.tags).length > 0 && (
                  <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    mt={1}
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    boxShadow="lg"
                    maxH="200px"
                    overflowY="auto"
                    zIndex={1000}
                  >
                    {getTagSuggestions(editFormData.tags).map((suggestion, index) => (
                      <Box
                        key={index}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "blue.50" }}
                        fontSize="sm"
                        onClick={() => handleEditTagSelect(suggestion)}
                      >
                        {suggestion}
                      </Box>
                    ))}
                  </Box>
                )}
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Favicon URL (optional)</FormLabel>
                <Input
                  value={editFormData.favicon_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, favicon_url: e.target.value }))}
                  placeholder="https://example.com/favicon.ico"
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Preview Image URL (optional)</FormLabel>
                <Input
                  value={editFormData.preview_image_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, preview_image_url: e.target.value }))}
                  placeholder="https://example.com/preview.jpg"
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Associated Projects</FormLabel>
                <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md" p={3}>
                  {projects.map(project => (
                    <Box
                      key={project.id}
                      as="label"
                      display="flex"
                      alignItems="center"
                      cursor="pointer"
                      _hover={{ bg: "gray.50" }}
                      p={2}
                      borderRadius="md"
                    >
                      <input
                        type="checkbox"
                        checked={editFormData.projectIds.includes(project.id)}
                        onChange={() => toggleProjectAssociation(project.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <Text fontSize="sm">{project.title}</Text>
                    </Box>
                  ))}
                </VStack>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Associated Genres ({editFormData.genreIds.length} selected)</FormLabel>
                <Wrap spacing={2} p={3} border="1px" borderColor="gray.200" borderRadius="md">
                  {genres.map(genre => (
                    <WrapItem key={genre.id}>
                      <Button
                        onClick={() => toggleGenreAssociation(genre.id)}
                        colorScheme={editFormData.genreIds.includes(genre.id) ? "green" : "gray"}
                        variant={editFormData.genreIds.includes(genre.id) ? "solid" : "outline"}
                        size="sm"
                        borderRadius="full"
                      >
                        {genre.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  )
}
