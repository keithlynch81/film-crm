'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from './WorkspaceProvider';

export default function WorkspaceDebug() {
  const { status, error, activeWorkspaceId, workspaces, refreshWorkspaces } = useWorkspace();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Avoid SSR → CSR text mismatches
  if (!mounted) return null;

  return (
    <div style={{ border: '1px dashed #ddd', padding: 12, borderRadius: 8, margin: '0 0 16px 0' }}>
      <div><strong>Status:</strong> {status}{error ? ` (${error})` : ''}</div>
      <div><strong>activeWorkspaceId:</strong> {activeWorkspaceId ?? '(null)'}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>localStorage.fc.activeWorkspaceId:</strong>
        <span>{localStorage.getItem('fc.activeWorkspaceId') ?? '(none)'}</span>
        <button onClick={() => { localStorage.removeItem('fc.activeWorkspaceId'); location.reload(); }}>
          Clear LS
        </button>
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Workspaces ({workspaces.length}):</strong>
        <ul style={{ marginTop: 6 }}>
          {workspaces.map(w => <li key={w.id}>{w.name} — {w.id}</li>)}
        </ul>
      </div>
      <button onClick={() => refreshWorkspaces()}>Refresh workspaces()</button>
    </div>
  );
}
