import type { Metadata } from 'next'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Film CRM',
  description: 'Multi-workspace Film CRM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ColorModeScript initialColorMode="light" />
        <ChakraProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </ChakraProvider>
      </body>
    </html>
  )
}