'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';
import { supabase } from '@/lib/supabase';

type MeetingRow = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  meeting_type: string | null;
  scheduled_at: string | null;   // timestamptz
  follow_up_due: string | null;  // timestamptz
  notes: string | null;
  // joined
  contacts?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    companies?: { name: string | null } | null;
  } | null;
};

export default function SchedulePage() {
  const { activeWorkspaceId } = useWorkspace();
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!activeWorkspaceId) { setRows([]); return; }

        const { data, error } = await supabase
          .from('meetings')
          .select(`
            id, contact_id, company_id, meeting_type, scheduled_at, follow_up_due, notes,
            contacts (
              first_name, last_name, email,
              companies ( name )
            )
          `)
          .eq('workspace_id', activeWorkspaceId)
          .order('scheduled_at', { ascending: true });

        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as MeetingRow[]);
      } catch (e:any) {
        if (!cancelled) setError(e.message || 'Failed to load schedule.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color: 'crimson' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Schedule</h1>
      {rows.length === 0 ? (
        <p>No meetings in this workspace.</p>
      ) : (
        <ul style={{ marginTop: 12 }}>
          {rows.map(m => {
            const name = [m.contacts?.first_name, m.contacts?.last_name].filter(Boolean).join(' ') || 'Unknown contact';
            const company = m.contacts?.companies?.name || '';
            const when = m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—';
            return (
              <li key={m.id} style={{ marginBottom: 12 }}>
                <div>
                  <span className="button-link">{name}</span>
                  {company ? <span style={{ marginLeft: 8 }}>— {company}</span> : null}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Type:</strong> {m.meeting_type ?? '—'} · <strong>When:</strong> {when}
                  {m.follow_up_due ? <> · <strong>Follow-up:</strong> {new Date(m.follow_up_due).toLocaleDateString()}</> : null}
                </div>
                {m.notes ? <div style={{ marginTop: 6 }}>{m.notes}</div> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
