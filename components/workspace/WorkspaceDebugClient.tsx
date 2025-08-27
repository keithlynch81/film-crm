'use client'

import { useWorkspace } from './WorkspaceProvider'

export function WorkspaceDebugClient() {
  const { status, user, workspaces, activeWorkspaceId } = useWorkspace()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 p-4 rounded border text-xs max-w-xs">
      <h4 className="font-bold">Debug Info</h4>
      <div>Status: {status}</div>
      <div>User: {user?.email || 'None'}</div>
      <div>Active Workspace: {activeWorkspaceId || 'None'}</div>
      <div>Workspaces: {workspaces.length}</div>
      {workspaces.map(w => (
        <div key={w.id} className="ml-2">
          {w.name} ({w.role})
        </div>
      ))}
    </div>
  )
}