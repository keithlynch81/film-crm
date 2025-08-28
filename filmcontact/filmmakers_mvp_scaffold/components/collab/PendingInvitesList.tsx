'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Invite = { id: string; email: string; role: 'viewer'|'editor'; status: string; created_at: string };

export default function PendingInvitesList({ projectId }: { projectId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);

  async function load() {
    const { data } = await supabase
      .from('project_invites')
      .select('id,email,role,status,created_at')
      .eq('project_id', projectId)
      .neq('status', 'accepted')
      .order('created_at', { ascending: false });
    setInvites((data ?? []) as Invite[]);
  }

  useEffect(() => { load(); }, [projectId]);

  async function revoke(id: string) {
    await supabase.from('project_invites').update({ status: 'revoked' }).eq('id', id);
    await load();
  }

  if (invites.length === 0) return null;

  return (
    <div className="card">
      <h3>Pending invites</h3>
      <ul className="list">
        {invites.map(i => (
          <li key={i.id} className="list-row">
            <span className="blue-text">{i.email}</span>
            <span className="muted">({i.role}, {i.status})</span>
            {i.status === 'pending' && <button className="button-link" onClick={()=>revoke(i.id)}>Revoke</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
