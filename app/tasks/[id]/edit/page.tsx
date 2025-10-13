'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  Heading,
  Card,
  CardBody,
  Text,
  Spinner,
  Center,
  useToast
} from '@chakra-ui/react'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

type Project = {
  id: string
  title: string
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
}

export default function EditTaskPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string
  const { activeWorkspaceId } = useWorkspace()
  const [heading, setHeading] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [contactId, setContactId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [priority, setPriority] = useState('3')
  const [status, setStatus] = useState('Outstanding')
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (activeWorkspaceId && taskId) {
      loadTask()
      loadProjects()
      loadContacts()
    }
  }, [activeWorkspaceId, taskId])

  const loadTask = async () => {
    if (!activeWorkspaceId || !taskId) return

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('workspace_id', activeWorkspaceId)
      .single()

    if (error) {
      console.error('Error loading task:', error)
      toast({
        title: 'Error loading task',
        status: 'error',
        duration: 3000,
      })
      router.push('/tasks')
    } else if (data) {
      setHeading(data.heading)
      setDescription(data.description || '')
      setProjectId(data.project_id || '')
      setContactId(data.contact_id || '')
      setTargetDate(data.target_date || '')
      setPriority(data.priority.toString())
      setStatus(data.status)
      setLoading(false)
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!heading.trim()) {
      toast({
        title: 'Task heading is required',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setSaving(true)

    const taskData = {
      heading: heading.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      contact_id: contactId || null,
      target_date: targetDate || null,
      priority: parseInt(priority),
      status
    }

    const { error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId)
      .eq('workspace_id', activeWorkspaceId)

    if (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error updating task',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
      setSaving(false)
    } else {
      toast({
        title: 'Task updated successfully',
        status: 'success',
        duration: 3000,
      })
      router.push('/tasks')
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
      <VStack spacing={6} align="stretch" maxW="800px" mx="auto">
        <Box>
          <Heading size="xl" color="gray.800" mb={2}>Edit Task</Heading>
          <Text fontSize="sm" color="gray.600">
            Update task details.
          </Text>
        </Box>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={5} align="stretch">
                {/* Task Heading */}
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Task Heading
                  </FormLabel>
                  <Input
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="Enter task heading..."
                    size="md"
                  />
                </FormControl>

                {/* Description */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Description
                  </FormLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed task information..."
                    rows={6}
                    size="md"
                  />
                </FormControl>

                {/* Project Link */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Link to Project (Optional)
                  </FormLabel>
                  <Select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    size="md"
                  >
                    <option value="">No Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* Contact Link */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Link to Contact (Optional)
                  </FormLabel>
                  <Select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    size="md"
                  >
                    <option value="">No Contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name || ''}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {/* Target Date, Priority, Status Row */}
                <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Target Date
                    </FormLabel>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      size="md"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Priority
                    </FormLabel>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      size="md"
                    >
                      <option value="1">1 (Highest)</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5 (Lowest)</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                      Status
                    </FormLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      size="md"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="In Process">In Process</option>
                      <option value="Completed">Completed</option>
                    </Select>
                  </FormControl>
                </Box>

                {/* Action Buttons */}
                <Box display="flex" gap={3} justifyContent="flex-end" pt={4}>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/tasks')}
                    size="md"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={saving}
                    loadingText="Saving..."
                    size="md"
                  >
                    Save Changes
                  </Button>
                </Box>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>
    </Layout>
  )
}
