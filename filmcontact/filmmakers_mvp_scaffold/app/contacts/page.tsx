'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Row = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  email: string | null;
  companies: { name: string | null } | null;
  tags: string[] | null;
};

export default function ContactsPage() {
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
          .from('contacts')
          .select('id,first_name,last_name,role,email,tags,companies(name)')
          .eq('workspace_id', activeWorkspaceId)
          .order('last_name',{ ascending:true });
        if (error) throw error;
        if (alive) setRows((data as any) ?? []);
      } catch (e:any) {
        if (alive) setError(e.message || 'Failed to load contacts');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) return <div>Pick a workspace to see contacts.</div>;
  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color:'crimson' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Contacts</h1>
      <div style={{ marginBottom: 12 }}>
        <Link href="/contacts/new">Add contact</Link>
      </div>

      {rows.length === 0 ? <p>No contacts yet.</p> : (
        <ul>
          {rows.map(c => (
            <li key={c.id} style={{ marginBottom:6 }}>
              <Link href={`/contacts/${c.id}`}>{c.first_name} {c.last_name}</Link>
              {c.companies?.name ? ` — ${c.companies.name}` : ''}{c.role ? ` (${c.role})` : ''}
              {c.tags?.length ? <span style={{ marginLeft:8, opacity:.75 }}>· {c.tags.map(t=>`#${t}`).join(' ')}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
