'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Row = {
  id: string;
  title: string;
  status: string | null;
  stage: string | null;
  tags: string[] | null;
};

export default function ProjectsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [rows, setRows]   = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        if (!activeWorkspaceId) { setRows([]); return; }
        const { data, error } = await supabase
          .from('projects')
          .select('id,title,status,stage,tags')
          .eq('workspace_id', activeWorkspaceId)
          .order('created_at', { ascending:false });
        if (error) throw error;
        if (alive) setRows((data as any) ?? []);
      } catch (e:any) {
        if (alive) setError(e.message || 'Failed to load projects');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) return <div>Pick a workspace to see projects.</div>;
  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color:'crimson' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Projects</h1>
      <div style={{ marginBottom: 12 }}>
        <Link href="/projects/new">Add project</Link>
      </div>

      {rows.length === 0 ? <p>No projects yet.</p> : (
        <ul>
          {rows.map(p => (
            <li key={p.id} style={{ marginBottom: 6 }}>
              <Link href={`/projects/${p.id}`}>{p.title}</Link>
              {p.status ? ` — ${p.status}` : ''}{p.stage ? ` (${p.stage})` : ''}
              {p.tags?.length ? <span style={{ marginLeft:8, opacity:.75 }}>· {p.tags.map(t=>`#${t}`).join(' ')}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
