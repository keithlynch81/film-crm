'use client';

import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

export default function WorkspaceDebugClient() {
  const { activeWorkspaceId, workspaces, refreshWorkspaces, status } = useWorkspace();

  return (
    <div style={{border:'1px dashed #ccc', padding:12, borderRadius:8}}>
      <div><strong>Status:</strong> {status}</div>
      <div><strong>activeWorkspaceId:</strong> {activeWorkspaceId || '(none)'}</div>
      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:6}}>
        <button type="button" onClick={refreshWorkspaces}>Refresh workspaces()</button>
      </div>
      <div style={{marginTop:8}}><strong>Workspaces ({workspaces.length}):</strong></div>
      <ul style={{marginTop:4}}>
        {workspaces.length === 0 ? <li>(none)</li> : workspaces.map(w => (
          <li key={w.id}>
            {w.name} — <code>{w.id}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
