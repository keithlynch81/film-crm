'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Collab = { id: string; user_id: string; role: 'viewer'|'editor'; created_at: string };

export default function CollaboratorsList({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Collab[]>([]);

  async function load() {
    const { data } = await supabase
      .from('project_collaborators')
      .select('id,user_id,role,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setRows((data ?? []) as Collab[]);
  }

  useEffect(()=>{ load(); }, [projectId]);

  async function remove(id: string) {
    await supabase.from('project_collaborators').delete().eq('id', id);
    await load();
  }

  return (
    <div className="card">
      <h3>Collaborators</h3>
      {rows.length === 0 ? <p className="muted">None yet.</p> : (
        <ul className="list">
          {rows.map(c => (
            <li key={c.id} className="list-row">
              <span className="blue-text">user:{c.user_id.slice(0,8)}…</span>
              <span className="muted">({c.role})</span>
              <button className="button-link" onClick={()=>remove(c.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
