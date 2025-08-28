// app/workspace-test/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WorkspaceTest() {
  const [user, setUser] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setStatus('loading');
      setErr(null);
      const { data: s } = await supabase.auth.getSession();
      setUser(s?.session?.user || null);

      if (!s?.session?.user) {
        setStatus('ok');
        return;
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select('id,name,workspace_members(role,user_id)')
        .order('name', { ascending: true });

      if (error) { setErr(error.message); setStatus('error'); return; }
      setWorkspaces(data ?? []);
      setStatus('ok');
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Workspace Test</h1>
      <p>Status: {status}</p>
      <pre>User: {JSON.stringify(user, null, 2)}</pre>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <pre>{JSON.stringify(workspaces, null, 2)}</pre>
    </div>
  );
}
