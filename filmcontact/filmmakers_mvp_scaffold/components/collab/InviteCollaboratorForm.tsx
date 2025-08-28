'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function InviteCollaboratorForm({
  projectId,
  projectWorkspaceId,
}: { projectId: string; projectWorkspaceId: string }) {
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer'|'editor'>('viewer');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', projectWorkspaceId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      setCanManage(data?.role === 'owner' || data?.role === 'admin');
    })();
  }, [projectWorkspaceId]);

  if (!canManage) return null;

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return setMsg('Sign in first.');
    const { error } = await supabase.from('project_invites').insert({
      project_id: projectId,
      email,
      role,
      invited_by: user.user.id,
    });
    setMsg(error ? error.message : 'Invite sent.');
    if (!error) { setEmail(''); setRole('viewer'); }
  }

  return (
    <div className="card">
      <h3>Invite collaborator</h3>
      <form onSubmit={onInvite} className="row">
        <input className="input" type="email" placeholder="email@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <select className="select" value={role} onChange={(e)=>setRole(e.target.value as any)}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button className="button-link">Send</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
