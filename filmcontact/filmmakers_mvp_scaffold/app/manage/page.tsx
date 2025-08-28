'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Member = {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  accepted_by: string | null;
};

export default function ManageWorkspacesPage() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
    status,
  } = useWorkspace();

  const current = useMemo(
    () => workspaces.find(w => w.id === activeWorkspaceId) || null,
    [workspaces, activeWorkspaceId]
  );

  // UI state
  const [renameVal, setRenameVal] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  // load lists whenever workspace changes
  useEffect(() => {
    setMsg(null);
    setError(null);
    setMembers([]);
    setInvites([]);
    setRenameVal(current?.name || '');
    if (!activeWorkspaceId) return;

    (async () => {
      try {
        // Members (NO join to users/auth.users)
        const { data: ms, error: me } = await supabase
          .from('workspace_members')
          .select('user_id, role, created_at')
          .eq('workspace_id', activeWorkspaceId)
          .order('created_at', { ascending: true });
        if (me) throw me;
        setMembers((ms ?? []) as Member[]);

        // Invites
        const { data: is, error: ie } = await supabase
          .from('workspace_invites')
          .select('id, email, role, token, status, created_at, accepted_by')
          .eq('workspace_id', activeWorkspaceId)
          .order('created_at', { ascending: false });
        if (ie) throw ie;
        setInvites((is ?? []) as Invite[]);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    })();
  }, [activeWorkspaceId, current?.name]);

  // rename
  async function renameWorkspace() {
    if (!activeWorkspaceId) return;
    if (!renameVal.trim()) return;
    setError(null); setMsg(null);

    const { error } = await supabase
      .from('workspaces')
      .update({ name: renameVal.trim() })
      .eq('id', activeWorkspaceId);

    if (error) { setError(error.message); return; }
    await refreshWorkspaces();
    setMsg('Workspace renamed.');
  }

  // create
  async function createWorkspace() {
    const name = prompt('Name for new workspace?')?.trim();
    if (!name) return;

    setError(null); setMsg(null);
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name })
      .select('id')
      .single();

    if (error) { setError(error.message); return; }

    // RLS/trigger should auto-add the creator as a member.
    await refreshWorkspaces();
    if (data?.id) setActiveWorkspaceId(data.id);
    setMsg('Workspace created.');
  }

  // leave
  async function leaveWorkspace() {
    if (!activeWorkspaceId) return;
    if (!confirm('Leave this workspace?')) return;

    setError(null); setMsg(null);

    // delete ONLY your membership
    const { data: s } = await supabase.auth.getUser();
    const uid = s.user?.id;
    if (!uid) { setError('Not signed in'); return; }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .match({ workspace_id: activeWorkspaceId, user_id: uid });

    if (error) { setError(error.message); return; }

    await refreshWorkspaces();
    setActiveWorkspaceId(
      (w => (w.length ? w[0].id : null))(workspaces.filter(w => w.id !== activeWorkspaceId))
    );
    setMsg('You left the workspace.');
  }

  // invite
  async function createInvite() {
    if (!activeWorkspaceId) return;
    const email = inviteEmail.trim();
    if (!email) return;

    setError(null); setMsg(null);

    const { data, error } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: activeWorkspaceId,
        email,
        role: inviteRole,
      })
      .select('id, token')
      .single();

    if (error) { setError(error.message); return; }

    setInviteEmail('');
    await reloadInvites();
    const link = `${location.origin}/accept-invite?token=${data!.token}`;
    setMsg('Invite created. Link copied to clipboard.');
    try { await navigator.clipboard.writeText(link); } catch {}
  }

  async function reloadInvites() {
    if (!activeWorkspaceId) return;
    const { data, error } = await supabase
      .from('workspace_invites')
      .select('id, email, role, token, status, created_at, accepted_by')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false });
    if (error) { setError(error.message); return; }
    setInvites((data ?? []) as Invite[]);
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase
      .from('workspace_invites')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (error) { setError(error.message); return; }
    await reloadInvites();
  }

  // member role changes (promote/demote)
  async function setMemberRole(user_id: string, role: 'admin' | 'member') {
    if (!activeWorkspaceId) return;
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .match({ workspace_id: activeWorkspaceId, user_id });
    if (error) { setError(error.message); return; }
    setMembers(ms => ms.map(m => m.user_id === user_id ? { ...m, role } : m));
  }

  async function removeMember(user_id: string) {
    if (!activeWorkspaceId) return;
    if (!confirm('Remove this member?')) return;

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .match({ workspace_id: activeWorkspaceId, user_id });

    if (error) { setError(error.message); return; }
    setMembers(ms => ms.filter(m => m.user_id !== user_id));
  }

  const headerName = current?.name || '(no workspace)';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 16 }}>
      <h1>Manage workspaces</h1>

      <section style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <div style={{ fontSize:14, opacity:.7 }}>Current workspace</div>
            <div style={{ fontWeight:700, fontSize:18, marginTop:4 }}>{headerName}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={createWorkspace}>+ New workspace</button>
            <button onClick={leaveWorkspace} style={{ color:'crimson' }}>Leave this workspace</button>
          </div>
        </div>

        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <input
            placeholder="Rename workspace…"
            value={renameVal}
            onChange={e=>setRenameVal(e.target.value)}
          />
          <button onClick={renameWorkspace}>Rename</button>
        </div>

        {error && <div style={errBox}>⚠ {error}</div>}
        {msg && <div style={okBox}>{msg}</div>}
      </section>

      <section style={card}>
        <h3>Invite a teammate</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center', maxWidth:560 }}>
          <input
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={e=>setInviteEmail(e.target.value)}
            style={{ flex:1 }}
          />
          <select value={inviteRole} onChange={e=>setInviteRole(e.target.value as any)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={createInvite}>+ Invite</button>
        </div>
      </section>

      <section style={card}>
        <h3>Invites</h3>
        {invites.length === 0 ? (
          <p>No pending or past invites.</p>
        ) : (
          <ul style={{ marginTop:8 }}>
            {invites.map(inv => {
              const link = `${location.origin}/accept-invite?token=${inv.token}`;
              return (
                <li key={inv.id} style={{ marginBottom:8 }}>
                  <strong>{inv.email}</strong> — {inv.role} — {inv.status}
                  <div style={{ display:'inline-flex', gap:8, marginLeft:8 }}>
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(link); setMsg('Invite link copied.'); } catch {} }}
                    >
                      Copy link
                    </button>
                    {inv.status === 'pending' && (
                      <button onClick={() => revokeInvite(inv.id)}>Revoke</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={card}>
        <h3>Members</h3>
        {members.length === 0 ? (
          <p>No members.</p>
        ) : (
          <ul style={{ marginTop:8 }}>
            {members.map(m => (
              <li key={m.user_id} style={{ marginBottom:8 }}>
                <code>{m.user_id}</code> — <em>{m.role}</em>
                {m.role !== 'owner' && (
                  <span style={{ marginLeft:8, display:'inline-flex', gap:6 }}>
                    {m.role === 'admin' ? (
                      <button onClick={() => setMemberRole(m.user_id, 'member')}>Make member</button>
                    ) : (
                      <button onClick={() => setMemberRole(m.user_id, 'admin')}>Make admin</button>
                    )}
                    <button onClick={() => removeMember(m.user_id)}>Remove</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p style={{ opacity:.7, marginTop:8 }}>
          (Emails/usernames are intentionally not shown here to avoid querying <code>auth.users</code> from the client.)
        </p>
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 12,
  margin: '12px 0',
};

const errBox: React.CSSProperties = {
  marginTop: 10,
  color: 'crimson',
};

const okBox: React.CSSProperties = {
  marginTop: 10,
  color: 'seagreen',
};
