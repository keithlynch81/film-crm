'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Heading,
  UnorderedList,
  ListItem,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react'
import Link from 'next/link'
import { Layout } from '@/components/Layout'
import { useWorkspace } from '@/components/workspace/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

export default function UploadProjectsPage() {
  const router = useRouter()
  const { activeWorkspaceId } = useWorkspace()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)

  // CSV Upload Function
  const handleFileUpload = async () => {
    if (!uploadFile || !activeWorkspaceId) return

    setUploading(true)
    setUploadComplete(false)
    try {
      const text = await uploadFile.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line)

      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, '').trim().toUpperCase())

      // Validate required columns
      const requiredColumns = ['TITLE']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        alert(`Missing required columns: ${missingColumns.join(', ')}`)
        setUploading(false)
        return
      }

      // Get reference data for matching
      const [mediumsRes, genresRes] = await Promise.all([
        supabase.from('mediums').select('*'),
        supabase.from('genres').select('*')
      ])

      const mediumsMap = new Map((mediumsRes.data || []).map((m: any) => [m.name.toLowerCase(), m]))
      const genresMap = new Map((genresRes.data || []).map((g: any) => [g.name.toLowerCase(), g]))

      const projectsToInsert = []

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i])
        if (values.length === 0) continue

        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].replace(/"/g, '').trim() : ''
        })

        if (!row.TITLE) continue

        // Create project data
        const projectData = {
          workspace_id: activeWorkspaceId,
          title: row.TITLE,
          logline: row.LOGLINE || null,
          status: row.STATUS || null,
          stage: row.STAGE || null,
          notes: row.NOTES || null,
          roles: ['Writer'], // Default role as requested
          tags: row.TAGS ? row.TAGS.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null
        }

        projectsToInsert.push({ data: projectData, mediums: row.MEDIUM || '', genres: row.GENRES || '' })
      }

      if (projectsToInsert.length === 0) {
        alert('No valid projects found in CSV file')
        setUploading(false)
        return
      }

      // Insert projects and get IDs
      let successCount = 0
      for (const item of projectsToInsert) {
        const { data: project, error } = await supabase
          .from('projects')
          .insert([item.data])
          .select()
          .single()

        if (error) {
          console.error('Error inserting project:', error)
          continue
        }

        successCount++

        // Handle mediums
        if (item.mediums) {
          const mediumNames = item.mediums.split(',').map((m: string) => m.trim()).filter((m: string) => m)
          for (const mediumName of mediumNames) {
            const medium = mediumsMap.get(mediumName.toLowerCase())
            if (medium) {
              await supabase.from('project_mediums').insert({
                project_id: project.id,
                medium_id: medium.id
              })
            }
          }
        }

        // Handle genres
        if (item.genres) {
          const genreNames = item.genres.split(',').map((g: string) => g.trim()).filter((g: string) => g)
          for (const genreName of genreNames) {
            const genre = genresMap.get(genreName.toLowerCase())
            if (genre) {
              await supabase.from('project_genres').insert({
                project_id: project.id,
                genre_id: genre.id
              })
            }
          }
        }
      }

      setUploadCount(successCount)
      setUploadComplete(true)
      setUploadFile(null)
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Error uploading CSV: ' + (error as any).message)
    }
    setUploading(false)
  }

  // Helper function to parse CSV rows properly
  const parseCSVRow = (row: string) => {
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

  return (
    <Layout>
      <VStack spacing={6} align="stretch" maxW="4xl">
        {/* Header with Back Button */}
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="xl" color="gray.800" mb={2}>Upload Projects CSV</Heading>
            <Text fontSize="sm" color="gray.600">
              Import multiple projects from a CSV file
            </Text>
          </Box>
          <Button
            as={Link}
            href="/projects"
            variant="outline"
            colorScheme="gray"
            size="md"
          >
            Back to Projects
          </Button>
        </Flex>

        {/* Success Message */}
        {uploadComplete && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Upload Complete!</AlertTitle>
              <AlertDescription>
                Successfully imported {uploadCount} project{uploadCount !== 1 ? 's' : ''}.
              </AlertDescription>
            </Box>
            <Button
              as={Link}
              href="/projects"
              colorScheme="blue"
              size="sm"
            >
              View Projects
            </Button>
          </Alert>
        )}

        {/* Instructions Card */}
        <Card>
          <CardBody>
            <Heading size="md" color="gray.800" mb={4}>
              CSV Format Requirements
            </Heading>

            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Required Columns:
                </Text>
                <UnorderedList fontSize="sm" color="gray.600" pl={4}>
                  <ListItem><strong>TITLE</strong> - The project title (required)</ListItem>
                </UnorderedList>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Optional Columns:
                </Text>
                <UnorderedList fontSize="sm" color="gray.600" pl={4}>
                  <ListItem><strong>LOGLINE</strong> - Brief description of the project</ListItem>
                  <ListItem><strong>STATUS</strong> - Current status (e.g., Active, On Hold, Completed)</ListItem>
                  <ListItem><strong>STAGE</strong> - Development stage (e.g., Concept, Short Story, Deck, Draft, Shooting Script, Finished Film)</ListItem>
                  <ListItem><strong>MEDIUM</strong> - Project medium(s) - separate multiple values with commas</ListItem>
                  <ListItem><strong>GENRES</strong> - Genre(s) - separate multiple values with commas</ListItem>
                  <ListItem><strong>TAGS</strong> - Custom tags - separate multiple values with commas</ListItem>
                  <ListItem><strong>NOTES</strong> - Additional notes about the project</ListItem>
                </UnorderedList>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Important Notes:
                </Text>
                <UnorderedList fontSize="sm" color="gray.600" pl={4}>
                  <ListItem>The first row must contain column headers (case-insensitive)</ListItem>
                  <ListItem>ROLE will default to 'Writer' for all imported projects</ListItem>
                  <ListItem>Multiple mediums should be separated by commas (e.g., "Film,TV")</ListItem>
                  <ListItem>Multiple genres should be separated by commas (e.g., "Drama,Thriller")</ListItem>
                  <ListItem>Multiple tags should be separated by commas (e.g., "urgent,festival")</ListItem>
                  <ListItem>Use double quotes around fields that contain commas or line breaks</ListItem>
                  <ListItem>Available mediums: Film, TV, Streaming, Theatre, Radio</ListItem>
                  <ListItem>Available genres: Drama, Comedy, Horror, Thriller, Action, Romance, Sci-Fi, Fantasy, Documentary, Animation</ListItem>
                </UnorderedList>
              </Box>

              <Box bg="gray.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Example CSV Format:
                </Text>
                <Box
                  as="pre"
                  fontSize="xs"
                  color="gray.700"
                  bg="white"
                  p={3}
                  borderRadius="md"
                  border="1px"
                  borderColor="gray.200"
                  overflowX="auto"
                >
{`TITLE,LOGLINE,STATUS,STAGE,MEDIUM,GENRES,TAGS,NOTES
"The Great Adventure","A thrilling journey",Active,Draft,Film,"Drama,Adventure",urgent,"Needs revision"
"Mystery House","A dark mystery unfolds",On Hold,Concept,TV,"Thriller,Horror",festival,"Awaiting feedback"`}
                </Box>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Upload Form */}
        <Card>
          <CardBody>
            <Heading size="md" color="gray.800" mb={4}>
              Select CSV File
            </Heading>

            <VStack spacing={4}>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] || null)
                  setUploadComplete(false)
                }}
                size="md"
                p={1}
              />

              <HStack spacing={3} justify="flex-end" w="full">
                <Button
                  as={Link}
                  href="/projects"
                  variant="outline"
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  isDisabled={!uploadFile || uploading}
                  isLoading={uploading}
                  loadingText="Uploading..."
                  colorScheme="blue"
                  size="md"
                >
                  Upload CSV
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Layout>
  )
}
