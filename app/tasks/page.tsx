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
  Checkbox,
  useToast
} from '@chakra-ui/react'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Task = {
  id: string
  heading: string
  description: string | null
  project_id: string | null
  contact_id: string | null
  target_date: string | null
  priority: number
  status: 'Outstanding' | 'In Process' | 'Completed'
  created_at: string
  projects?: { title: string } | null
  contacts?: { first_name: string; last_name: string | null } | null
}

type Project = {
  id: string
  title: string
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
}

export default function TasksPage() {
  const { activeWorkspaceId } = useWorkspace()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedContact, setSelectedContact] = useState('')

  const toast = useToast()

  useEffect(() => {
    if (activeWorkspaceId) {
      loadTasks()
      loadProjects()
      loadContacts()
    }
  }, [activeWorkspaceId])

  const loadTasks = async () => {
    if (!activeWorkspaceId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(title),
        contacts(first_name, last_name)
      `)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error loading tasks:', error)
      console.error('Error details:', error.message, error.code)
    } else {
      console.log('Loaded tasks:', data)
      setTasks(data || [])
    }
    setLoading(false)
  }

  const loadProjects = async () => {
    if (!activeWorkspaceId) return

    const { data } = await supabase
      .from('projects')
      .select('id, title')
      .eq('workspace_id', activeWorkspaceId)
      .order('title')

    if (data) setProjects(data)
  }

  const loadContacts = async () => {
    if (!activeWorkspaceId) return

    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('workspace_id', activeWorkspaceId)
      .order('first_name')

    if (data) setContacts(data)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error updating task status:', error)
      toast({
        title: 'Error updating task',
        status: 'error',
        duration: 3000,
      })
    } else {
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        )
      )
      toast({
        title: 'Task updated',
        status: 'success',
        duration: 2000,
      })
    }
  }

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Outstanding' : 'Completed'
    await handleStatusChange(task.id, newStatus)
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error deleting task',
        status: 'error',
        duration: 3000,
      })
    } else {
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))
      toast({
        title: 'Task deleted',
        status: 'success',
        duration: 2000,
      })
    }
  }

  const isOverdue = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'Completed') return false
    return new Date(targetDate) < new Date(new Date().setHours(0, 0, 0, 0))
  }

  const isDueToday = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'Completed') return false
    const today = new Date().setHours(0, 0, 0, 0)
    const taskDate = new Date(targetDate).setHours(0, 0, 0, 0)
    return taskDate === today
  }

  const isDueThisWeek = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'Completed') return false
    const today = new Date().setHours(0, 0, 0, 0)
    const taskDate = new Date(targetDate).setHours(0, 0, 0, 0)
    const weekFromNow = new Date(today + 7 * 24 * 60 * 60 * 1000)
    return taskDate > today && taskDate <= weekFromNow.getTime()
  }

  // Calculate task counts for summary banner
  const overdueTasks = tasks.filter(t => isOverdue(t.target_date, t.status))
  const todayTasks = tasks.filter(t => isDueToday(t.target_date, t.status))
  const weekTasks = tasks.filter(t => isDueThisWeek(t.target_date, t.status))
  const hasSummaryItems = overdueTasks.length > 0 || todayTasks.length > 0 || weekTasks.length > 0

  const filteredTasks = tasks.filter(task => {
    // Hide completed tasks unless showCompleted is true
    if (!showCompleted && task.status === 'Completed') return false

    // Text search
    const search = searchTerm.toLowerCase()
    const matchesSearch = !search || (
      task.heading.toLowerCase().includes(search) ||
      task.description?.toLowerCase().includes(search)
    )

    // Status filter
    const matchesStatus = !selectedStatus || task.status === selectedStatus

    // Priority filter
    const matchesPriority = !selectedPriority || task.priority === parseInt(selectedPriority)

    // Project filter
    const matchesProject = !selectedProject || task.project_id === selectedProject

    // Contact filter
    const matchesContact = !selectedContact || task.contact_id === selectedContact

    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesContact
  })

  // Sort by priority (1-5), then by target date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    if (a.target_date && b.target_date) {
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    }
    if (a.target_date) return -1
    if (b.target_date) return 1
    return 0
  })

  const clearAllFilters = () => {
    setSelectedStatus('')
    setSelectedPriority('')
    setSelectedProject('')
    setSelectedContact('')
    setSearchTerm('')
  }

  const hasActiveFilters = selectedStatus || selectedPriority || selectedProject || selectedContact || searchTerm

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
            <Heading size="xl" color="gray.800" mb={2}>Tasks</Heading>
            <Text fontSize="sm" color="gray.600">
              Manage your tasks and to-do items.
            </Text>
          </Box>
          <Button
            as={Link}
            href="/tasks/new"
            colorScheme="blue"
            size="md"
            w={{ base: "full", md: "auto" }}
          >
            Add Task
          </Button>
        </Flex>

        {/* Task Summary Banner */}
        {hasSummaryItems && (
          <Card bg="blue.50" borderColor="blue.200" borderWidth="1px">
            <CardBody>
              <Flex direction={{ base: "column", md: "row" }} gap={4} align={{ base: "stretch", md: "center" }}>
                <Box>
                  <Flex align="center" gap={2} mb={2}>
                    <Text fontSize="md" fontWeight="bold" color="gray.800">
                      📋 Task Summary
                    </Text>
                  </Flex>
                  <Text fontSize="sm" color="gray.600">
                    Quick overview of your upcoming and overdue tasks
                  </Text>
                </Box>

                <Flex gap={3} flex={1} justify={{ base: "flex-start", md: "flex-end" }} flexWrap="wrap">
                  {overdueTasks.length > 0 && (
                    <Box
                      bg="red.100"
                      borderColor="red.300"
                      borderWidth="1px"
                      borderRadius="md"
                      px={4}
                      py={2}
                      textAlign="center"
                      minW="120px"
                    >
                      <Text fontSize="2xl" fontWeight="bold" color="red.700">
                        {overdueTasks.length}
                      </Text>
                      <Text fontSize="xs" color="red.700" fontWeight="medium">
                        🔴 OVERDUE
                      </Text>
                    </Box>
                  )}

                  {todayTasks.length > 0 && (
                    <Box
                      bg="orange.100"
                      borderColor="orange.300"
                      borderWidth="1px"
                      borderRadius="md"
                      px={4}
                      py={2}
                      textAlign="center"
                      minW="120px"
                    >
                      <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                        {todayTasks.length}
                      </Text>
                      <Text fontSize="xs" color="orange.700" fontWeight="medium">
                        🟠 DUE TODAY
                      </Text>
                    </Box>
                  )}

                  {weekTasks.length > 0 && (
                    <Box
                      bg="yellow.100"
                      borderColor="yellow.300"
                      borderWidth="1px"
                      borderRadius="md"
                      px={4}
                      py={2}
                      textAlign="center"
                      minW="120px"
                    >
                      <Text fontSize="2xl" fontWeight="bold" color="yellow.700">
                        {weekTasks.length}
                      </Text>
                      <Text fontSize="xs" color="yellow.700" fontWeight="medium">
                        🟡 THIS WEEK
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardBody>
            {/* Search Bar */}
            <Flex gap={4} align="end" mb={showFilters ? 6 : 0} direction={{ base: "column", md: "row" }}>
              <Box flex={1} maxW={{ base: "full", md: "384px" }}>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Search Tasks
                </Text>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by heading or description..."
                  size="md"
                />
              </Box>

              <Flex gap={3} w={{ base: "full", md: "auto" }} direction={{ base: "column", sm: "row" }}>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  colorScheme={showFilters ? "blue" : "gray"}
                  variant={showFilters ? "solid" : "outline"}
                  size="md"
                  w={{ base: "full", sm: "auto" }}
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>

                {hasActiveFilters && (
                  <Button
                    onClick={clearAllFilters}
                    colorScheme="red"
                    variant="outline"
                    size="md"
                    w={{ base: "full", sm: "auto" }}
                  >
                    Clear All
                  </Button>
                )}
              </Flex>
            </Flex>

            {/* Advanced Filters */}
            <Collapse in={showFilters}>
              <Box borderTop="1px" borderColor="gray.200" pt={6}>
                <VStack align="stretch" spacing={4}>
                  <Flex gap={4} direction={{ base: "column", md: "row" }}>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Status
                      </Text>
                      <Select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        size="md"
                      >
                        <option value="">All Statuses</option>
                        <option value="Outstanding">Outstanding</option>
                        <option value="In Process">In Process</option>
                        <option value="Completed">Completed</option>
                      </Select>
                    </Box>

                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Priority
                      </Text>
                      <Select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        size="md"
                      >
                        <option value="">All Priorities</option>
                        <option value="1">1 (Highest)</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5 (Lowest)</option>
                      </Select>
                    </Box>
                  </Flex>

                  <Flex gap={4} direction={{ base: "column", md: "row" }}>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Project
                      </Text>
                      <Select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        size="md"
                      >
                        <option value="">All Projects</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </Select>
                    </Box>

                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                        Contact
                      </Text>
                      <Select
                        value={selectedContact}
                        onChange={(e) => setSelectedContact(e.target.value)}
                        size="md"
                      >
                        <option value="">All Contacts</option>
                        {contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name || ''}
                          </option>
                        ))}
                      </Select>
                    </Box>
                  </Flex>

                  {/* Show Completed Toggle */}
                  <Box>
                    <Checkbox
                      isChecked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      colorScheme="blue"
                    >
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        Show completed tasks
                      </Text>
                    </Checkbox>
                  </Box>

                  {/* Results Summary */}
                  <Box p={3} bg="gray.50" borderRadius="md" fontSize="sm" color="gray.600">
                    <Text>
                      Showing {sortedTasks.length} of {tasks.length} tasks
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

        {/* Tasks List */}
        <Card>
          {sortedTasks.length === 0 ? (
            <CardBody>
              <Center py={12}>
                <VStack spacing={2}>
                  {tasks.length === 0 ? (
                    <>
                      <Text color="gray.600" mb={2}>No tasks yet.</Text>
                      <Text as={Link} href="/tasks/new" color="blue.500" textDecoration="none">
                        Create your first task
                      </Text>
                    </>
                  ) : (
                    <Text color="gray.600">No tasks match your current filters.</Text>
                  )}
                </VStack>
              </Center>
            </CardBody>
          ) : (
            <CardBody>
              {/* Mobile Card Layout */}
              <Box display={{ base: "block", md: "none" }}>
                <VStack spacing={3} align="stretch">
                  {sortedTasks.map((task) => (
                    <Card key={task.id} size="sm" bg={isOverdue(task.target_date, task.status) ? "red.50" : "white"}>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="start">
                            <HStack spacing={2} flex={1}>
                              <Checkbox
                                isChecked={task.status === 'Completed'}
                                onChange={() => handleToggleComplete(task)}
                                colorScheme="green"
                              />
                              <VStack align="start" spacing={1} flex={1}>
                                <Text
                                  fontWeight="medium"
                                  fontSize="md"
                                  textDecoration={task.status === 'Completed' ? 'line-through' : 'none'}
                                  color={task.status === 'Completed' ? 'gray.500' : 'gray.800'}
                                >
                                  {task.heading}
                                </Text>
                                {task.description && (
                                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                    {task.description}
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                            <Badge colorScheme="blue" borderRadius="full" fontSize="xs">
                              P{task.priority}
                            </Badge>
                          </Flex>

                          <Flex gap={2} flexWrap="wrap" fontSize="xs" color="gray.600">
                            {task.target_date && (
                              <Text>
                                📅 {new Date(task.target_date).toLocaleDateString('en-GB')}
                              </Text>
                            )}
                            {task.projects && (
                              <Text>🎬 {task.projects.title}</Text>
                            )}
                            {task.contacts && (
                              <Text>👤 {task.contacts.first_name} {task.contacts.last_name || ''}</Text>
                            )}
                          </Flex>

                          <Flex gap={2}>
                            <Select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              size="sm"
                              flex={1}
                            >
                              <option value="Outstanding">Outstanding</option>
                              <option value="In Process">In Process</option>
                              <option value="Completed">Completed</option>
                            </Select>
                            <Button
                              as={Link}
                              href={`/tasks/${task.id}/edit`}
                              size="sm"
                              variant="outline"
                              colorScheme="blue"
                            >
                              Edit
                            </Button>
                            <IconButton
                              aria-label="Delete task"
                              icon={<Text>🗑️</Text>}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(task.id)}
                            />
                          </Flex>
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
                      <Th width="80px" pr={8}>Priority</Th>
                      <Th>Task</Th>
                      <Th width="120px">Target Date</Th>
                      <Th width="150px">Status</Th>
                      <Th width="180px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedTasks.map((task) => (
                      <Tr
                        key={task.id}
                        _hover={{ bg: "gray.50" }}
                        bg={isOverdue(task.target_date, task.status) ? "red.50" : "white"}
                      >
                        <Td>
                          <Badge colorScheme="blue" borderRadius="full" fontSize="xs">
                            {task.priority}
                          </Badge>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text
                              fontWeight="medium"
                              fontSize="sm"
                              textDecoration={task.status === 'Completed' ? 'line-through' : 'none'}
                              color={task.status === 'Completed' ? 'gray.500' : 'gray.800'}
                            >
                              {task.heading}
                            </Text>
                            {task.description && (
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: '#6b7280',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  width: '100%'
                                }}
                              >
                                {task.description}
                              </div>
                            )}
                            <Flex gap={2} fontSize="xs" color="gray.600" flexWrap="wrap">
                              {task.projects && <Text>🎬 {task.projects.title}</Text>}
                              {task.contacts && <Text>👤 {task.contacts.first_name} {task.contacts.last_name || ''}</Text>}
                            </Flex>
                          </VStack>
                        </Td>
                        <Td>
                          {task.target_date && (
                            <Text fontSize="sm" color="gray.600">
                              {new Date(task.target_date).toLocaleDateString('en-GB')}
                            </Text>
                          )}
                        </Td>
                        <Td>
                          <Select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            size="sm"
                          >
                            <option value="Outstanding">Outstanding</option>
                            <option value="In Process">In Process</option>
                            <option value="Completed">Completed</option>
                          </Select>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <Button
                              as={Link}
                              href={`/tasks/${task.id}/edit`}
                              size="sm"
                              variant="outline"
                              colorScheme="blue"
                            >
                              Edit
                            </Button>
                            <IconButton
                              aria-label="Delete task"
                              icon={<Text>🗑️</Text>}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(task.id)}
                            />
                          </HStack>
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
