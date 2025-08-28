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
  Badge,
  Card,
  CardBody,
  Grid,
  GridItem,
  Spinner,
  Center,
  Collapse,
  Container,
  Heading,
  Wrap,
  WrapItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Submission = {
  id: string
  project_id: string
  contact_id: string
  status: string | null
  submitted_at: string
  notes: string | null
  feedback: string | null
  projects: {
    title: string
  }
  contacts: {
    first_name: string
    last_name: string | null
    companies: {
      name: string
    } | null
  }
}

const getStatusColorScheme = (status: string | null) => {
  switch (status) {
    case 'Accepted':
      return 'green'
    case 'Rejected':
      return 'red'
    case 'Under Review':
      return 'orange'
    case 'Shortlisted':
      return 'blue'
    default:
      return 'gray'
  }
}

export default function SubmissionsPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (activeWorkspaceId) {
      loadSubmissions()
    }
  }, [activeWorkspaceId])

  const loadSubmissions = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        projects:project_id (
          title
        ),
        contacts:contact_id (
          first_name,
          last_name,
          companies:company_id (
            name
          )
        )
      `)
      .eq('workspace_id', activeWorkspaceId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading submissions:', error)
    } else {
      setSubmissions(data || [])
    }
    setLoading(false)
  }

  const filteredSubmissions = submissions.filter(submission => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = (
      submission.projects.title.toLowerCase().includes(search) ||
      submission.contacts.first_name.toLowerCase().includes(search) ||
      submission.contacts.last_name?.toLowerCase().includes(search) ||
      submission.contacts.companies?.name?.toLowerCase().includes(search) ||
      submission.notes?.toLowerCase().includes(search) ||
      submission.feedback?.toLowerCase().includes(search)
    )
    
    const matchesStatus = !statusFilter || submission.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    'Submitted',
    'Under Review',
    'Shortlisted',
    'Accepted',
    'Rejected',
    'Withdrawn'
  ]

  const statusCounts = statusOptions.reduce((acc, status) => {
    acc[status] = submissions.filter(s => s.status === status).length
    return acc
  }, {} as Record<string, number>)

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
        <Box>
          <Heading size="xl" color="gray.800" mb={2}>Submissions</Heading>
          <Text fontSize="sm" color="gray.600">
            Track all project submissions across your workspace.
          </Text>
        </Box>

        {/* Search and Filters */}
        <Card>
          <CardBody>
            {/* Search Bar */}
            <Flex gap={4} align="end" mb={showFilters ? 6 : 0}>
              <Box flex={1} maxW="384px">
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Search Submissions
                </Text>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by project, contact, company, or notes..."
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
                
                {statusFilter && (
                  <Button
                    onClick={() => setStatusFilter('')}
                    colorScheme="gray"
                    variant="outline"
                    size="md"
                  >
                    Clear Filters
                  </Button>
                )}
              </Flex>
            </Flex>

            {/* Advanced Filters */}
            <Collapse in={showFilters}>
              <Box borderTop="1px" borderColor="gray.200" pt={6}>
                <VStack align="stretch" spacing={5}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                      Filter by Status
                    </Text>
                    <Wrap spacing={2}>
                      <WrapItem>
                        <Button
                          onClick={() => setStatusFilter('')}
                          colorScheme={statusFilter === '' ? "blue" : "gray"}
                          variant={statusFilter === '' ? "solid" : "outline"}
                          size="sm"
                          borderRadius="full"
                        >
                          All ({submissions.length})
                        </Button>
                      </WrapItem>
                      {statusOptions.map((status) => (
                        <WrapItem key={status}>
                          <Button
                            onClick={() => setStatusFilter(status)}
                            colorScheme={statusFilter === status ? "blue" : "gray"}
                            variant={statusFilter === status ? "solid" : "outline"}
                            size="sm"
                            borderRadius="full"
                          >
                            {status} ({statusCounts[status] || 0})
                          </Button>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                </VStack>
              </Box>
            </Collapse>
          </CardBody>
        </Card>

        {/* Submissions List */}
        <Card>
          {filteredSubmissions.length === 0 ? (
            <CardBody>
              <Center py={12}>
                <VStack spacing={2}>
                  {submissions.length === 0 ? (
                    <>
                      <Text color="gray.600" mb={2}>No submissions yet.</Text>
                      <Text fontSize="sm" color="gray.600">
                        Submissions are created from individual{' '}
                        <Text as={Link} href="/projects" color="blue.500" textDecoration="none">
                          project pages
                        </Text>
                        .
                      </Text>
                    </>
                  ) : (
                    <Text color="gray.600">No submissions match your filters.</Text>
                  )}
                </VStack>
              </Center>
            </CardBody>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Project
                    </Th>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Contact
                    </Th>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Company
                    </Th>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Status
                    </Th>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Submitted
                    </Th>
                    <Th fontSize="xs" fontWeight="medium" color="gray.600" textTransform="uppercase" letterSpacing="wide">
                      Notes
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSubmissions.map((submission) => (
                    <Tr key={submission.id} _hover={{ bg: "gray.50" }}>
                      <Td>
                        <Text as={Link} href={`/projects/${submission.project_id}`} color="blue.500" fontWeight="medium" fontSize="sm" _hover={{ textDecoration: "underline" }}>
                          {submission.projects.title}
                        </Text>
                      </Td>
                      <Td>
                        <Text as={Link} href={`/contacts/${submission.contact_id}`} color="blue.500" fontWeight="medium" fontSize="sm" _hover={{ textDecoration: "underline" }}>
                          {submission.contacts.first_name} {submission.contacts.last_name}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {submission.contacts.companies?.name || '—'}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColorScheme(submission.status)} borderRadius="full">
                          {submission.status || 'No Status'}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {new Date(submission.submitted_at).toLocaleDateString('en-GB')}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600" isTruncated maxW="200px">
                          {submission.notes || submission.feedback || '—'}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* Summary Stats */}
        {submissions.length > 0 && (
          <Card>
            <CardBody>
              <Heading size="md" color="gray.800" mb={4}>Summary</Heading>
              <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={4}>
                <Box textAlign="center">
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">{submissions.length}</Text>
                  <Text fontSize="sm" color="gray.600">Total</Text>
                </Box>
                {statusOptions.map((status) => {
                  const count = statusCounts[status] || 0
                  return (
                    <Box key={status} textAlign="center">
                      <Text fontSize="2xl" fontWeight="bold" color="gray.800">{count}</Text>
                      <Text fontSize="sm" color="gray.600">{status}</Text>
                    </Box>
                  )
                })}
              </Grid>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Layout>
  )
}