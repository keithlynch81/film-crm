'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Wrap,
  WrapItem,
  Checkbox,
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

export default function NewTaskPage() {
  const router = useRouter()
  const { activeWorkspaceId } = useWorkspace()
  const [heading, setHeading] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [contactIds, setContactIds] = useState<string[]>([])
  const [targetDate, setTargetDate] = useState('')
  const [priority, setPriority] = useState('3')
  const [status, setStatus] = useState('Outstanding')
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (activeWorkspaceId) {
      loadProjects()
      loadContacts()
    }
  }, [activeWorkspaceId])

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

    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('workspace_id', activeWorkspaceId)
      .order('first_name')

    if (error) {
      console.error('Error loading contacts:', error)
    } else {
      console.log('Loaded contacts:', data)
      setContacts(data || [])
    }
  }

  const toggleContact = (contactId: string) => {
    setContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
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
      workspace_id: activeWorkspaceId,
      heading: heading.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      contact_id: contactIds.length > 0 ? contactIds[0] : null, // Keep first contact for backward compatibility
      target_date: targetDate || null,
      priority: parseInt(priority),
      status,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      toast({
        title: 'Error creating task',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
      setSaving(false)
      return
    }

    // Associate task with multiple contacts
    if (contactIds.length > 0 && task) {
      const { error: junctionError } = await supabase
        .from('task_contacts')
        .insert(
          contactIds.map(contactId => ({
            task_id: task.id,
            contact_id: contactId
          }))
        )

      if (junctionError) {
        console.error('Error linking contacts:', junctionError)
        // Don't fail the whole operation if junction inserts fail
      }
    }

    toast({
      title: 'Task created successfully',
      status: 'success',
      duration: 3000,
    })
    router.push('/tasks')
  }

  return (
    <Layout>
      <VStack spacing={6} align="stretch" maxW="800px" mx="auto">
        <Box>
          <Heading size="xl" color="gray.800" mb={2}>New Task</Heading>
          <Text fontSize="sm" color="gray.600">
            Create a new task to track your to-do items.
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

                {/* Contact Links (Multiple) */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Link to Contacts ({contactIds.length} selected)
                  </FormLabel>
                  <Box border="1px" borderColor="gray.200" borderRadius="md" p={3} maxH="200px" overflowY="auto">
                    {contacts.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">No contacts available</Text>
                    ) : (
                      <Wrap spacing={2}>
                        {contacts.map((contact) => (
                          <WrapItem key={contact.id}>
                            <Checkbox
                              isChecked={contactIds.includes(contact.id)}
                              onChange={() => toggleContact(contact.id)}
                              colorScheme="blue"
                              size="sm"
                            >
                              <Text fontSize="sm">
                                {contact.first_name} {contact.last_name || ''}
                              </Text>
                            </Checkbox>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}
                  </Box>
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
                    loadingText="Creating..."
                    size="md"
                  >
                    Create Task
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
