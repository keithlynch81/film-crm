import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';

// 👇 lazy-load the client-only debug so it never renders on the server
const WorkspaceDebugClient = dynamic(
  () => import('@/components/workspace/WorkspaceDebugClient'),
  { ssr: false }
);

export const metadata: Metadata = { title: 'Filmmakers CRM' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const showDebug = true; // set false to hide the panel

  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
            <Link href="/projects">Projects</Link>
            <Link href="/contacts">Contacts</Link>
            <Link href="/submissions">Submissions</Link>
            <Link href="/schedule">Schedule</Link>
            <div style={{ marginLeft: 'auto' }}>
              <WorkspaceSwitcher />
            </div>
          </nav>

          {showDebug && (
            <div className="page-container" style={{ marginBottom: 16 }}>
              <WorkspaceDebugClient />
            </div>
          )}

          <main className="page-container">{children}</main>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
