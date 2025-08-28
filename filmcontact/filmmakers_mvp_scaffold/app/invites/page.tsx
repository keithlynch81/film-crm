'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type WsInvite = { id: string; workspace_id: string; role: string; status: string; created_at: string; workspaces: { id: string; name: string } };
type ProjInvite = { id: string; project_id: string; role: string; status: string; created_at: string; projects: { id: string; title: string } };

export default function InvitesPage() {
  const [wsInvites, setWsInvites] = useState<WsInvite[]>([]);
  const [projInvites, setProjInvites] = useState<ProjInvite[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data: w } = await supabase
      .from('workspace_invites')
      .select('id,workspace_id,role,status,created_at,workspaces(id,name)')
      .eq('status','pending')
      .order('created_at',{ascending:true});
    setWsInvites((w ?? []) as WsInvite[]);

    const { data: p } = await supabase
      .from('project_invites')
      .select('id,project_id,role,status,created_at,projects(id,title)')
      .eq('status','pending')
      .order('created_at',{ascending:true});
    setProjInvites((p ?? []) as ProjInvite[]);
  }

  useEffect(()=>{ load(); },[]);

  async function acceptWs(id: string) {
    setMsg(null);
    const { error } = await supabase.rpc('accept_workspace_invite',{ p_invite_id: id });
    if (error) setMsg(error.message); else { setMsg('Workspace invite accepted.'); await load(); }
  }
  async function acceptProj(id: string) {
    setMsg(null);
    const { error } = await supabase.rpc('accept_project_invite',{ p_invite_id: id });
    if (error) setMsg(error.message); else { setMsg('Project invite accepted.'); await load(); }
  }

  return (
    <div className="page-container">
      <h1>My Invites</h1>
      {msg && <p className="muted">{msg}</p>}

      <h2>Workspace invites</h2>
      {wsInvites.length === 0 ? <p className="muted">None.</p> : (
        <ul className="list">
          {wsInvites.map(i=>(
            <li key={i.id} className="list-row">
              <span className="button-link">{i.workspaces?.name ?? 'Workspace'}</span>
              <span className="muted">(role: {i.role})</span>
              <button className="button-link" onClick={()=>acceptWs(i.id)}>Accept</button>
            </li>
          ))}
        </ul>
      )}

      <h2>Project invites</h2>
      {projInvites.length === 0 ? <p className="muted">None.</p> : (
        <ul className="list">
          {projInvites.map(i=>(
            <li key={i.id} className="list-row">
              <Link className="button-link" href={`/projects/${i.project_id}`}>{i.projects?.title ?? 'Project'}</Link>
              <span className="muted">(role: {i.role})</span>
              <button className="button-link" onClick={()=>acceptProj(i.id)}>Accept</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
