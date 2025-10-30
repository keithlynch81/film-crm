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
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Wrap,
  WrapItem,
  Badge,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Link as ChakraLink,
  Image
} from '@chakra-ui/react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Mandate = {
  id: string
  buyer: string
  sum_up: string
  overall_tone: string | null
  genres: string[] | null
  key_traits: string | null
  in_short: string | null
  created_at: string
  updated_at: string
}

type Article = {
  id: string
  title: string
  url: string
  source: string
  published_at: string
  content_snippet: string | null
}

type TrackedTerm = {
  id: string
  term: string
  term_type: string
  created_at: string
  match_count: number
  last_match_at: string | null
  tracked_term_matches: {
    article_id: string
    matched_at: string
    news_articles: Article
  }[]
}

type Genre = {
  id: number
  name: string
}

export default function IndustryPage() {
  const { activeWorkspaceId, user } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Mandates state
  const [mandates, setMandates] = useState<Mandate[]>([])
  const { isOpen: isMandateOpen, onOpen: onMandateOpen, onClose: onMandateClose } = useDisclosure()
  const [editingMandate, setEditingMandate] = useState<Mandate | null>(null)
  const [mandateForm, setMandateForm] = useState({
    buyer: '',
    sum_up: '',
    overall_tone: '',
    genres: [] as string[],
    key_traits: '',
    in_short: ''
  })

  // Market Intelligence state
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesLoading, setArticlesLoading] = useState(false)

  // Track state
  const [trackedTerms, setTrackedTerms] = useState<TrackedTerm[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [newTermType, setNewTermType] = useState('project')
  const [addingTerm, setAddingTerm] = useState(false)

  // Genres for mandates
  const [genres, setGenres] = useState<Genre[]>([])

  useEffect(() => {
    if (activeWorkspaceId && user) {
      // Check if user is admin
      setIsAdmin(user.email === 'keith@arecibomedia.com')

      loadMandates()
      loadArticles()
      loadTrackedTerms()
      loadGenres()
    }
  }, [activeWorkspaceId, user])

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

  const loadMandates = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('mandates')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading mandates:', error)
    } else {
      setMandates(data || [])
    }
    setLoading(false)
  }

  const loadArticles = async () => {
    if (!activeWorkspaceId) return

    setArticlesLoading(true)

    // Get all contacts for this workspace
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', activeWorkspaceId)

    if (contactError) {
      console.error('Error loading contacts:', contactError)
      setArticlesLoading(false)
      return
    }

    const contactIds = (contactData || []).map(c => c.id)

    if (contactIds.length === 0) {
      setArticles([])
      setArticlesLoading(false)
      return
    }

    // Get all articles matched to these contacts
    const { data: matchData, error: matchError } = await supabase
      .from('news_contact_matches')
      .select(`
        article_id,
        news_articles (
          id,
          title,
          url,
          source,
          published_at,
          content_snippet
        )
      `)
      .in('contact_id', contactIds)
      .order('created_at', { ascending: false })
      .limit(100)

    if (matchError) {
      console.error('Error loading article matches:', matchError)
    } else {
      // Extract unique articles
      const uniqueArticles = new Map()
      matchData?.forEach((match: any) => {
        const article = match.news_articles
        if (article && !uniqueArticles.has(article.id)) {
          uniqueArticles.set(article.id, article)
        }
      })

      const articlesArray = Array.from(uniqueArticles.values())
        .sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

      setArticles(articlesArray as Article[])
    }
    setArticlesLoading(false)
  }

  const loadTrackedTerms = async () => {
    if (!activeWorkspaceId) return

    const { data, error } = await supabase
      .from('tracked_terms')
      .select(`
        *,
        tracked_term_matches (
          article_id,
          matched_at,
          news_articles (
            id,
            title,
            url,
            source,
            published_at,
            content_snippet
          )
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading tracked terms:', error)
    } else {
      setTrackedTerms(data as any || [])
    }
  }

  const openMandateModal = (mandate?: Mandate) => {
    if (mandate) {
      setEditingMandate(mandate)
      setMandateForm({
        buyer: mandate.buyer,
        sum_up: mandate.sum_up,
        overall_tone: mandate.overall_tone || '',
        genres: mandate.genres || [],
        key_traits: mandate.key_traits || '',
        in_short: mandate.in_short || ''
      })
    } else {
      setEditingMandate(null)
      setMandateForm({
        buyer: '',
        sum_up: '',
        overall_tone: '',
        genres: [],
        key_traits: '',
        in_short: ''
      })
    }
    onMandateOpen()
  }

  const handleSaveMandate = async () => {
    if (!activeWorkspaceId || !user) return

    try {
      const mandateData = {
        workspace_id: activeWorkspaceId,
        buyer: mandateForm.buyer,
        sum_up: mandateForm.sum_up,
        overall_tone: mandateForm.overall_tone || null,
        genres: mandateForm.genres.length > 0 ? mandateForm.genres : null,
        key_traits: mandateForm.key_traits || null,
        in_short: mandateForm.in_short || null,
        created_by: user.id
      }

      if (editingMandate) {
        const { error } = await supabase
          .from('mandates')
          .update(mandateData)
          .eq('id', editingMandate.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('mandates')
          .insert([mandateData])

        if (error) throw error
      }

      onMandateClose()
      loadMandates()
    } catch (error: any) {
      console.error('Error saving mandate:', error)
      alert('Error saving mandate: ' + error.message)
    }
  }

  const handleDeleteMandate = async (mandateId: string) => {
    if (!confirm('Are you sure you want to delete this mandate?')) return

    try {
      const { error } = await supabase
        .from('mandates')
        .delete()
        .eq('id', mandateId)

      if (error) throw error

      loadMandates()
    } catch (error: any) {
      console.error('Error deleting mandate:', error)
      alert('Error deleting mandate: ' + error.message)
    }
  }

  const toggleGenre = (genreName: string) => {
    setMandateForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genreName)
        ? prev.genres.filter(g => g !== genreName)
        : [...prev.genres, genreName]
    }))
  }

  const handleAddTrackedTerm = async () => {
    if (!activeWorkspaceId || !user || !newTerm.trim()) return

    setAddingTerm(true)
    try {
      // Insert the new tracked term (simple insert first)
      const { data: insertedTerm, error } = await supabase
        .from('tracked_terms')
        .insert([{
          workspace_id: activeWorkspaceId,
          term: newTerm.trim(),
          term_type: newTermType,
          created_by: user.id,
          match_count: 0
        }])
        .select()
        .single()

      if (error) throw error

      // Add the new term to the state immediately so it appears in the list
      if (insertedTerm) {
        // Create a display-ready version with empty matches array
        const displayTerm = {
          ...insertedTerm,
          tracked_term_matches: []
        }
        setTrackedTerms(prev => [displayTerm as any, ...prev])

        // Search for matches in existing articles (this will update the term in the background)
        matchTermToExistingArticles(insertedTerm.id, newTerm.trim()).then(() => {
          // Reload to get updated match counts
          loadTrackedTerms()
        })
      }

      setNewTerm('')
      setNewTermType('project')
    } catch (error: any) {
      console.error('Error adding tracked term:', error)
      alert('Error adding tracked term: ' + error.message)
    }
    setAddingTerm(false)
  }

  const matchTermToExistingArticles = async (termId: string, term: string) => {
    try {
      // Get recent articles (last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: articles, error: articlesError } = await supabase
        .from('news_articles')
        .select('id, title, content_snippet')
        .gte('published_at', ninetyDaysAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(500)

      if (articlesError) {
        console.error('Error fetching articles:', articlesError)
        return
      }

      if (!articles || articles.length === 0) return

      // Find matches (case-insensitive)
      const termLower = term.toLowerCase()
      const matches: { term_id: string; article_id: string }[] = []

      for (const article of articles) {
        const titleLower = (article.title || '').toLowerCase()
        const contentLower = (article.content_snippet || '').toLowerCase()

        if (titleLower.includes(termLower) || contentLower.includes(termLower)) {
          matches.push({
            term_id: termId,
            article_id: article.id
          })
        }
      }

      // Insert matches if found
      if (matches.length > 0) {
        const { error: matchError } = await supabase
          .from('tracked_term_matches')
          .insert(
            matches.map(m => ({
              tracked_term_id: m.term_id,
              article_id: m.article_id,
              confidence: 0.80
            }))
          )

        if (matchError) {
          console.error('Error inserting matches:', matchError)
        } else {
          // Update the tracked term's match count
          const { error: updateError } = await supabase
            .from('tracked_terms')
            .update({
              match_count: matches.length,
              last_match_at: new Date().toISOString()
            })
            .eq('id', termId)

          if (updateError) {
            console.error('Error updating match count:', updateError)
          }
        }
      }
    } catch (error) {
      console.error('Error matching term to articles:', error)
    }
  }

  const handleDeleteTrackedTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to stop tracking this term?')) return

    try {
      const { error } = await supabase
        .from('tracked_terms')
        .delete()
        .eq('id', termId)

      if (error) throw error

      loadTrackedTerms()
    } catch (error: any) {
      console.error('Error deleting tracked term:', error)
      alert('Error deleting tracked term: ' + error.message)
    }
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
        {/* Header */}
        <Box>
          <Heading size="xl" color="gray.800" mb={2}>Industry</Heading>
          <Text fontSize="sm" color="gray.600">
            Buyer mandates, market intelligence, and tracked projects/people/companies.
          </Text>
        </Box>

        {/* Tabs for three sections */}
        <Tabs colorScheme="blue" size="md">
          <TabList>
            {isAdmin && <Tab fontWeight="medium">Mandates</Tab>}
            <Tab fontWeight="medium">Market Intelligence</Tab>
            <Tab fontWeight="medium">Track</Tab>
          </TabList>

          <TabPanels>
            {/* MANDATES TAB - ADMIN ONLY */}
            {isAdmin && <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.600">
                    {mandates.length} {mandates.length === 1 ? 'mandate' : 'mandates'}
                  </Text>
                  <Button
                    onClick={() => openMandateModal()}
                    colorScheme="blue"
                    size="sm"
                  >
                    + Add Mandate
                  </Button>
                </Flex>

                {mandates.length === 0 ? (
                  <Card>
                    <CardBody>
                      <Center py={12}>
                        <VStack spacing={2}>
                          <Text color="gray.600">No mandates yet.</Text>
                          <Text fontSize="sm" color="gray.500">
                            Add buyer requirements and mandates to track what the industry is looking for.
                          </Text>
                        </VStack>
                      </Center>
                    </CardBody>
                  </Card>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {mandates.map(mandate => (
                      <Card key={mandate.id}>
                        <CardBody>
                          <Flex justify="space-between" align="flex-start">
                            <Box flex={1}>
                              <Heading size="md" color="gray.800" mb={1}>
                                {mandate.buyer}
                              </Heading>
                              {mandate.overall_tone && (
                                <Text fontSize="sm" color="gray.600" mb={2}>
                                  <strong>Overall Tone:</strong> {mandate.overall_tone}
                                </Text>
                              )}
                              <Text fontSize="sm" color="gray.700" mb={3}>
                                {mandate.sum_up}
                              </Text>

                              {mandate.genres && mandate.genres.length > 0 && (
                                <Box mb={2}>
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                                    Genre Focus:
                                  </Text>
                                  <Wrap spacing={1}>
                                    {mandate.genres.map((genre, idx) => (
                                      <Badge key={idx} colorScheme="green" borderRadius="full" fontSize="xs">
                                        {genre}
                                      </Badge>
                                    ))}
                                  </Wrap>
                                </Box>
                              )}

                              {mandate.key_traits && (
                                <Text fontSize="sm" color="gray.600" mb={2}>
                                  <strong>Key Traits They Want:</strong> {mandate.key_traits}
                                </Text>
                              )}

                              {mandate.in_short && (
                                <Text fontSize="sm" color="gray.600" mb={2}>
                                  <strong>In Short:</strong> {mandate.in_short}
                                </Text>
                              )}

                              <Text fontSize="xs" color="gray.500">
                                Added {new Date(mandate.created_at).toLocaleDateString('en-GB')}
                              </Text>
                            </Box>

                            <HStack spacing={2}>
                              <IconButton
                                icon={
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                }
                                aria-label="Edit mandate"
                                size="sm"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => openMandateModal(mandate)}
                              />
                              <IconButton
                                icon={
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                }
                                aria-label="Delete mandate"
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeleteMandate(mandate.id)}
                              />
                            </HStack>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </VStack>
            </TabPanel>}

            {/* MARKET INTELLIGENCE TAB */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  Industry news articles related to your contacts - {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                </Text>

                {articlesLoading ? (
                  <Center py={12}>
                    <Spinner size="lg" color="blue.500" />
                  </Center>
                ) : articles.length === 0 ? (
                  <Card>
                    <CardBody>
                      <Center py={12}>
                        <VStack spacing={2}>
                          <Text color="gray.600">No articles found.</Text>
                          <Text fontSize="sm" color="gray.500">
                            Articles from RSS feeds will appear here when they match your contacts.
                          </Text>
                        </VStack>
                      </Center>
                    </CardBody>
                  </Card>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {articles.map(article => (
                      <Card key={article.id}>
                        <CardBody>
                          <VStack align="stretch" spacing={2}>
                            <Flex justify="space-between" align="flex-start">
                              <Box flex={1}>
                                <ChakraLink
                                  href={article.url}
                                  isExternal
                                  color="blue.600"
                                  fontWeight="semibold"
                                  fontSize="md"
                                  _hover={{ textDecoration: "underline" }}
                                >
                                  {article.title}
                                </ChakraLink>
                              </Box>
                            </Flex>

                            {article.content_snippet && (
                              <Text fontSize="sm" color="gray.700" noOfLines={2}>
                                {article.content_snippet}
                              </Text>
                            )}

                            <Flex gap={4} fontSize="xs" color="gray.500">
                              <Text>
                                <strong>{article.source}</strong>
                              </Text>
                              <Text>
                                {new Date(article.published_at).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </Text>
                            </Flex>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* TRACK TAB */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                <Card>
                  <CardBody>
                    <Heading size="sm" color="gray.800" mb={3}>
                      Add Term to Track
                    </Heading>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Get notified when projects, people, or companies appear in industry news.
                    </Text>

                    <Flex gap={3} direction={{ base: "column", md: "row" }}>
                      <FormControl flex={2}>
                        <Input
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                          placeholder="e.g., Star Wars, Christopher Nolan, Netflix"
                          size="md"
                        />
                      </FormControl>

                      <FormControl flex={1}>
                        <Select
                          value={newTermType}
                          onChange={(e) => setNewTermType(e.target.value)}
                          size="md"
                        >
                          <option value="project">Project</option>
                          <option value="person">Person</option>
                          <option value="company">Company</option>
                          <option value="custom">Custom</option>
                        </Select>
                      </FormControl>

                      <Button
                        onClick={handleAddTrackedTerm}
                        isDisabled={!newTerm.trim() || addingTerm}
                        isLoading={addingTerm}
                        colorScheme="blue"
                        size="md"
                        flexShrink={0}
                      >
                        Track
                      </Button>
                    </Flex>
                  </CardBody>
                </Card>

                {trackedTerms.length === 0 ? (
                  <Card>
                    <CardBody>
                      <Center py={12}>
                        <VStack spacing={2}>
                          <Text color="gray.600">No tracked terms yet.</Text>
                          <Text fontSize="sm" color="gray.500">
                            Start tracking projects, people, or companies to get notified of industry news.
                          </Text>
                        </VStack>
                      </Center>
                    </CardBody>
                  </Card>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {trackedTerms.map(term => (
                      <Card key={term.id}>
                        <CardBody>
                          <Flex justify="space-between" align="flex-start" mb={3}>
                            <Box flex={1}>
                              <Flex align="center" gap={2} mb={1}>
                                <Heading size="md" color="gray.800">
                                  {term.term}
                                </Heading>
                                <Badge colorScheme="purple" fontSize="xs">
                                  {term.term_type}
                                </Badge>
                                {term.match_count > 0 ? (
                                  <Badge colorScheme="green" fontSize="xs">
                                    {term.match_count} {term.match_count === 1 ? 'match' : 'matches'}
                                  </Badge>
                                ) : (
                                  <Badge colorScheme="gray" fontSize="xs">
                                    No matches yet
                                  </Badge>
                                )}
                              </Flex>
                              <Text fontSize="xs" color="gray.500">
                                Tracking since {new Date(term.created_at).toLocaleDateString('en-GB')}
                                {term.last_match_at && ` • Last match: ${new Date(term.last_match_at).toLocaleDateString('en-GB')}`}
                              </Text>
                            </Box>

                            <IconButton
                              icon={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                              }
                              aria-label="Stop tracking"
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteTrackedTerm(term.id)}
                            />
                          </Flex>

                          {term.tracked_term_matches && term.tracked_term_matches.length > 0 ? (
                            <VStack align="stretch" spacing={2} mt={3} pt={3} borderTop="1px" borderColor="gray.200">
                              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                Matching Articles:
                              </Text>
                              {term.tracked_term_matches.slice(0, 5).map(match => (
                                <Box key={match.article_id} pl={3} borderLeft="2px" borderColor="blue.300">
                                  <ChakraLink
                                    href={match.news_articles.url}
                                    isExternal
                                    color="blue.600"
                                    fontSize="sm"
                                    fontWeight="medium"
                                    _hover={{ textDecoration: "underline" }}
                                  >
                                    {match.news_articles.title}
                                  </ChakraLink>
                                  <Flex gap={3} fontSize="xs" color="gray.500" mt={1}>
                                    <Text>{match.news_articles.source}</Text>
                                    <Text>
                                      {new Date(match.news_articles.published_at).toLocaleDateString('en-GB', {
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </Text>
                                  </Flex>
                                </Box>
                              ))}
                              {term.tracked_term_matches.length > 5 && (
                                <Text fontSize="xs" color="gray.600" pl={3}>
                                  +{term.tracked_term_matches.length - 5} more articles
                                </Text>
                              )}
                            </VStack>
                          ) : (
                            <Box mt={3} pt={3} borderTop="1px" borderColor="gray.200">
                              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                No matching articles found yet. New matches will appear here automatically when articles mentioning "{term.term}" are published.
                              </Text>
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Mandate Modal */}
      <Modal isOpen={isMandateOpen} onClose={onMandateClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingMandate ? 'Edit Mandate' : 'Add New Mandate'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm">BUYER</FormLabel>
                <Input
                  value={mandateForm.buyer}
                  onChange={(e) => setMandateForm(prev => ({ ...prev, buyer: e.target.value }))}
                  placeholder="e.g., John Smith"
                  size="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm">SUM UP</FormLabel>
                <Textarea
                  value={mandateForm.sum_up}
                  onChange={(e) => setMandateForm(prev => ({ ...prev, sum_up: e.target.value }))}
                  placeholder="Brief summary of what they're looking for"
                  rows={3}
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">OVERALL TONE</FormLabel>
                <Input
                  value={mandateForm.overall_tone}
                  onChange={(e) => setMandateForm(prev => ({ ...prev, overall_tone: e.target.value }))}
                  placeholder="e.g., Gritty, uplifting, dark comedy"
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">GENRE FOCUS ({mandateForm.genres.length} selected)</FormLabel>
                <Wrap spacing={2} p={3} border="1px" borderColor="gray.200" borderRadius="md">
                  {genres.map(genre => (
                    <WrapItem key={genre.id}>
                      <Button
                        onClick={() => toggleGenre(genre.name)}
                        colorScheme={mandateForm.genres.includes(genre.name) ? "green" : "gray"}
                        variant={mandateForm.genres.includes(genre.name) ? "solid" : "outline"}
                        size="sm"
                        borderRadius="full"
                      >
                        {genre.name}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">KEY TRAITS THEY WANT</FormLabel>
                <Textarea
                  value={mandateForm.key_traits}
                  onChange={(e) => setMandateForm(prev => ({ ...prev, key_traits: e.target.value }))}
                  placeholder="e.g., Strong female lead, international locations, based on true story"
                  rows={3}
                  size="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">IN SHORT</FormLabel>
                <Textarea
                  value={mandateForm.in_short}
                  onChange={(e) => setMandateForm(prev => ({ ...prev, in_short: e.target.value }))}
                  placeholder="Quick one-liner summary"
                  rows={2}
                  size="md"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onMandateClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveMandate}
              isDisabled={!mandateForm.buyer || !mandateForm.sum_up}
            >
              {editingMandate ? 'Save Changes' : 'Add Mandate'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  )
}
