'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  VStack,
  Container,
  Hide,
  Show,
  Spinner,
  Center
} from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons'
import { useWorkspace } from './workspace/WorkspaceProvider'
import { NotificationDropdown } from './NotificationDropdown'
import { UserProfileDropdown } from './UserProfileDropdown'

type LayoutProps = {
  children: React.ReactNode
}

const navigationItems = [
  { href: '/projects', label: 'Projects' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/submissions', label: 'Submissions' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/notebook', label: 'Notebook' },
]

export function Layout({ children }: LayoutProps) {
  const { status } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }

  if (status === 'loading') {
    return (
      <Center minH="100vh" bg="gray.50">
        <Spinner size="lg" color="blue.500" />
      </Center>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Center minH="100vh" bg="gray.50">
        Redirecting...
      </Center>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Navigation Bar */}
      <Box as="nav" bg="white" borderBottom="1px" borderColor="gray.200" py={4}>
        <Container maxW="1200px">
          <Flex justify="space-between" align="center">
            {/* Logo */}
            <Link href="/projects">
              <Image
                src="/fiink_logo.png"
                alt="Fiink"
                width={80}
                height={32}
                style={{ height: 'auto' }}
              />
            </Link>

            {/* Desktop Navigation */}
            <Hide below="md">
              <HStack spacing={2}>
                {navigationItems.map((item) => (
                  <Button
                    key={item.href}
                    as={Link}
                    href={item.href}
                    size="sm"
                    borderRadius="full"
                    colorScheme={isActive(item.href) ? "blue" : "gray"}
                    variant={isActive(item.href) ? "solid" : "ghost"}
                    _hover={{
                      textDecoration: 'none',
                      bg: isActive(item.href) ? 'blue.600' : 'gray.100'
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </HStack>
            </Hide>

            {/* Right Side Items */}
            <HStack spacing={4}>
              <NotificationDropdown />
              <UserProfileDropdown />
              
              {/* Mobile Hamburger Menu */}
              <Show below="md">
                <IconButton
                  icon={<HamburgerIcon />}
                  variant="outline"
                  onClick={onOpen}
                  aria-label="Open Navigation Menu"
                />
              </Show>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Navigation</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  size="md"
                  borderRadius="full"
                  colorScheme={isActive(item.href) ? "blue" : "gray"}
                  variant={isActive(item.href) ? "solid" : "ghost"}
                  onClick={onClose}
                  _hover={{
                    textDecoration: 'none',
                    bg: isActive(item.href) ? 'blue.600' : 'gray.100'
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Container maxW="1200px" py={6}>
        {children}
      </Container>
    </Box>
  )
}