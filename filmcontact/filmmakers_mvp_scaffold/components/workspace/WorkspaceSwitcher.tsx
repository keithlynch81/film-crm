'use client';

import { useRouter } from 'next/navigation';
import { useWorkspace } from './WorkspaceProvider';

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const { status, workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();

  if (status === 'loading') return <span style={{ opacity: .7 }}>Loading workspaces…</span>;
  if (status === 'no-auth') return <a href="/login">Sign in</a>;
  if (!workspaces.length) return <span style={{ color: 'crimson' }}>No workspace</span>;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === '__manage__') {
      router.push('/workspace/manage');
      return;
    }
    setActiveWorkspaceId(v || null);
  }

  return (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontWeight: 600 }}>Workspace:</span>
      <select value={activeWorkspaceId ?? ''} onChange={onChange}>
        {workspaces.map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
        <option value="__manage__">— Manage workspaces…</option>
      </select>
    </label>
  );
}
