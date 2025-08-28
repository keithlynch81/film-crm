'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';
import { supabase } from '@/lib/supabase';

type SubmissionRow = {
  id: string;
  project_id: string | null;
  contact_id: string | null;
  status: string | null;
  material: string | null;
  contact_status: string | null;
  submitted_at: string | null; // timestamptz
  sent_at: string | null;      // date
  notes: string | null;
  feedback: string | null;
  // Joined:
  projects?: { title: string | null } | null;
  contacts?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    companies?: { name: string | null } | null;
  } | null;
};

export default function SubmissionsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
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
          .from('submissions')
          .select(`
            id, project_id, contact_id, status, material, contact_status,
            submitted_at, sent_at, notes, feedback,
            projects ( title ),
            contacts (
              first_name, last_name, email,
              companies ( name )
            )
          `)
          .eq('workspace_id', activeWorkspaceId)
          .order('submitted_at', { ascending: true });

        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as SubmissionRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load submissions.');
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
      <h1>Submissions</h1>

      {rows.length === 0 ? (
        <p>No submissions in this workspace.</p>
      ) : (
        <ul className="submission-list">
          {rows.map(r => {
            const projectTitle = r.projects?.title || 'Untitled project';
            const name = [r.contacts?.first_name, r.contacts?.last_name].filter(Boolean).join(' ') || 'Unknown contact';
            const company = r.contacts?.companies?.name || '';
            const email = r.contacts?.email || '';
            return (
              <li key={r.id} className="submission-card">
                <div>
                  <Link href={r.project_id ? `/projects/${r.project_id}` : '#'} className="button-link">
                    {projectTitle}
                  </Link>
                </div>

                <div className="submission-details">
                  <div className="blue-text">{name}</div>
                  {company ? <div className="blue-text">{company}</div> : null}
                  {email ? (
                    <div>
                      <a href={`mailto:${email}`} className="blue-text">{email}</a>
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 8 }}>
                  <strong>Material:</strong> {r.material ?? '—'} ·{' '}
                  <strong>Status:</strong> {r.status ?? '—'}{' '}
                  {r.submitted_at ? `· ${new Date(r.submitted_at).toLocaleDateString()}` : ''}
                </div>

                {r.feedback ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Feedback:</strong> {r.feedback}
                  </div>
                ) : null}
                {r.notes ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Notes:</strong> {r.notes}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
