'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type MemberRole = 'owner' | 'admin' | 'member';
type InviteStatus = 'pending' | 'accepted' | 'revoked';

type InviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  status: InviteStatus;
  created_at: string;
};

export default function ManageWorkspacesPage() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
    status: wsStatus,
  } = useWorkspace();

  const active = workspaces.find(w => w.id === activeWorkspaceId) || null;

  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Invites
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');

  // ---------- helpers ----------
  function say(s: string) {
    setMsg(s);
    // auto clear after a few seconds
    setTimeout(() => setMsg(''), 3500);
  }

  async function loadInvites() {
    if (!activeWorkspaceId) { setInvites([]); return; }
    const { data, error } = await supabase
      .from('workspace_invites')
      .select('id,workspace_id,email,role,status,created_at')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('invites select failed', error);
      say(error.message || 'Failed to load invites.');
      return;
    }
    setInvites(data as InviteRow[]);
  }

  useEffect(() => {
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  // ---------- workspace actions ----------
  async function createWorkspace() {
    const name = prompt('Name for the new workspace?');
    if (!name) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name })
      .select('id')
      .single();

    setLoading(false);
    if (error) {
      console.error('create workspace failed', error);
      say(error.message || 'Create workspace failed.');
      return;
    }
    await refreshWorkspaces();
    setActiveWorkspaceId(data!.id);
    say('Workspace created.');
  }

  async function renameWorkspace() {
    if (!activeWorkspaceId || !active) return;
    const newName = prompt('New name?', active.name);
    if (!newName || newName === active.name) return;

    setLoading(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ name: newName })
      .eq('id', activeWorkspaceId);

    setLoading(false);
    if (error) {
      console.error('rename workspace failed', error);
      say(error.message || 'Rename failed.');
      return;
    }
    await refreshWorkspaces();
    say('Workspace renamed.');
  }

  async function leaveWorkspace() {
    if (!activeWorkspaceId) return;
    if (!confirm('Are you sure you want to leave this workspace?')) return;

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) { say('No user.'); return; }

    setLoading(true);
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', activeWorkspaceId)
      .eq('user_id', userId);

    setLoading(false);
    if (error) {
      console.error('leave workspace failed', error);
      say(error.message || 'Leave failed.');
      return;
    }
    await refreshWorkspaces();
    // Pick the first workspace if any remain
    const next = (w: typeof workspaces) => (w.length ? w[0].id : null);
    setActiveWorkspaceId(next(workspaces));
    say('You left the workspace.');
  }

  // ---------- invite actions ----------
  async function sendInvite() {
    if (!activeWorkspaceId) { say('No active workspace'); return; }
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: activeWorkspaceId,
        email,
        role: inviteRole,
        // status defaults to 'pending' via enum default if you set that in SQL.
        // If you do NOT have a default, you can uncomment the next line:
        // status: 'pending',
      });

    setLoading(false);

    if (error) {
      // 23505 is unique_violation (e.g., your “unique pending invite” constraint)
      if ((error as any).code === '23505') {
        say('An invite is already pending for that email.');
      } else {
        console.error('invite insert failed', error);
        say(error.message || 'Invite failed.');
      }
      return;
    }

    setInviteEmail('');
    await loadInvites();
    say('Invite created. Copy the email you entered.');
  }

  async function revokeInvite(id: string) {
    if (!activeWorkspaceId) return;
    if (!confirm('Revoke this invite?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('workspace_invites')
      .update({ status: 'revoked' })
      .eq('id', id)
      .eq('workspace_id', activeWorkspaceId);

    setLoading(false);
    if (error) {
      console.error('revoke failed', error);
      say(error.message || 'Revoke failed.');
      return;
    }
    await loadInvites();
    say('Invite revoked.');
  }

  // ---------- render ----------
  if (wsStatus === 'loading') return <div style={{ padding: 16 }}>Loading…</div>;
  if (!activeWorkspaceId || !active) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Manage workspaces</h1>
        <p>No active workspace.</p>
        <button onClick={createWorkspace}>+ New workspace</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h1>Manage workspaces</h1>

      {!!msg && (
        <div style={{
          border: '1px solid #ddd',
          background: '#f7f7ff',
          padding: 10,
          borderRadius: 6,
          color: '#333'
        }}>
          {msg}
        </div>
      )}

      {/* Current workspace card */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Current workspace</div>
          <button onClick={renameWorkspace} disabled={loading}>Rename</button>
          <button onClick={createWorkspace} disabled={loading}>+ New workspace</button>
          <button onClick={leaveWorkspace} disabled={loading} style={{ marginLeft: 'auto', color: 'crimson' }}>
            Leave this workspace
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 18 }}>{active.name}</div>
      </section>

      {/* Invite form */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Invite a teammate</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="teammate@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as MemberRole)}>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <button onClick={sendInvite} disabled={loading || !inviteEmail.trim()}>+ Invite</button>
        </div>
      </section>

      {/* Invites list */}
      <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Invites</div>
        {invites.length === 0 ? (
          <div style={{ opacity: .7 }}>No pending or past invites.</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.id}>
                  <td style={td}>{inv.email}</td>
                  <td style={td}>{inv.role}</td>
                  <td style={td}>{inv.status}</td>
                  <td style={td}>{new Date(inv.created_at).toLocaleString()}</td>
                  <td style={tdRight}>
                    {inv.status === 'pending' && (
                      <button onClick={() => revokeInvite(inv.id)} disabled={loading} style={{ color: 'crimson' }}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' };
const td: React.CSSProperties = { borderBottom: '1px solid #f3f3f3', padding: '6px 8px' };
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
