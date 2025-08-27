import type { Metadata } from 'next'
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
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  )
}