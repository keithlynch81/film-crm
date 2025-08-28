'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Project = {
  id: string;
  title: string;
  logline: string | null;
  notes: string | null;
  status: string | null;
  stage: string | null;
  tags: string[] | null;
  medium: { name: string | null } | null;
  budget: { label: string | null; unit: 'total'|'per_episode'|null } | null;
  genres: { genre: { name: string } }[] | null;
};

type ContactLite = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
  companies: { name: string | null } | null;
};

type SubmissionRow = {
  id: string;
  contact: ContactLite | null;
  material: 'IDEA'|'ONE PAGER'|'TREATMENT'|'MINI DECK'|'DECK'|'DRAFT'|'FINAL DRAFT' | null;
  sent_at: string | null; // YYYY-MM-DD
  contact_status: 'OUTSTANDING'|'PASS'|'MEETING'|'SALE' | null;
  feedback: string | null;
};

const MATERIALS = ['IDEA','ONE PAGER','TREATMENT','MINI DECK','DECK','DRAFT','FINAL DRAFT'] as const;
const SUB_STATUSES = ['OUTSTANDING','PASS','MEETING','SALE'] as const;

function pretty(s?: string | null) {
  if (!s) return '—';
  const clean = s.replace(/_/g, ' ').toLowerCase();
  return clean.replace(/\b\w/g, m => m.toUpperCase());
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [p, setP] = useState<Project | null>(null);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  // add form
  const [selContactId, setSelContactId] = useState<string>('');
  const [material, setMaterial] = useState<typeof MATERIALS[number]>('IDEA');
  const [sentAt, setSentAt]     = useState<string>('');
  const [subStatus, setSubStatus] = useState<typeof SUB_STATUSES[number]>('OUTSTANDING');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [
          { data: proj, error: pe },
          { data: cs },
          { data: ss },
        ] = await Promise.all([
          supabase
            .from('projects')
            .select(`
              id, title, logline, notes, status, stage, tags,
              medium:mediums ( name ),
              budget:budget_ranges ( label, unit ),
              genres:project_genres ( genre:genres ( name ) )
            `)
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('contacts')
            .select(`id, first_name, last_name, role, email, companies ( name )`)
            .order('last_name', { ascending: true }),
          supabase
            .from('submissions')
            .select(`
              id, material, sent_at, contact_status, feedback,
              contact:contacts ( id, first_name, last_name, role, email, companies ( name ) )
            `)
            .eq('project_id', id)
            .order('submitted_at', { ascending: false }),
        ]);

        if (pe) throw pe;
        if (!alive) return;
        setP(proj as any);
        setContacts((cs as any) ?? []);
        setSubs((ss as any) ?? []);
      } catch (e:any) {
        if (!alive) return;
        setError(e.message || 'Failed to load project.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function addSubmission() {
    try {
      if (!selContactId) return;
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('Please sign in again.');

      const payload = {
        user_id: userId,
        contact_id: selContactId,
        project_id: id,
        material,
        sent_at: sentAt || null,
        contact_status: subStatus,
        feedback: feedback || null,
      };

      const { data, error: e } = await supabase
        .from('submissions')
        .insert([payload])
        .select(`
          id, material, sent_at, contact_status, feedback,
          contact:contacts ( id, first_name, last_name, role, email, companies ( name ) )
        `)
        .single();
      if (e) throw e;

      setSubs(prev => [data as any, ...prev]);
      setSelContactId('');
      setMaterial('IDEA');
      setSentAt('');
      setSubStatus('OUTSTANDING');
      setFeedback('');
    } catch (e:any) {
      alert(e.message || 'Could not add submission');
    }
  }

  async function updateSubmission(subId: string, patch: Partial<SubmissionRow>) {
    try {
      const { error: e } = await supabase.from('submissions').update(patch).eq('id', subId);
      if (e) throw e;
      setSubs(prev => prev.map(s => s.id === subId ? { ...s, ...patch } : s));
    } catch (e:any) {
      alert(e.message || 'Update failed');
    }
  }

  async function deleteSubmission(subId: string) {
    if (!confirm('Remove this submission?')) return;
    try {
      const { error: e } = await supabase.from('submissions').delete().eq('id', subId);
      if (e) throw e;
      setSubs(prev => prev.filter(s => s.id !== subId));
    } catch (e:any) {
      alert(e.message || 'Delete failed');
    }
  }

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color:'crimson' }}>Error: {error}</div>;
  if (!p)      return <div>Not found.</div>;

  const budgetText = p.budget?.label ? `${p.budget.label}${p.budget.unit==='per_episode'?' (per ep)':''}` : '—';

  return (
    <div>
      <h1>{p.title}</h1>
      <p><strong>Status:</strong> {pretty(p.status)}{p.stage ? ` · ${pretty(p.stage)}` : ''}</p>
      <p><strong>Medium:</strong> {p.medium?.name || '—'}</p>
      <p><strong>Budget:</strong> {budgetText}</p>
      <p><strong>Genres:</strong> {p.genres?.length ? p.genres.map(g=>g.genre.name).join(', ') : '—'}</p>
      <p><strong>Tags:</strong> {p.tags?.length ? p.tags.map(t=>`#${t}`).join(' ') : '—'}</p>

      <h3>Logline</h3>
      <p style={{ whiteSpace:'pre-wrap' }}>{p.logline || '—'}</p>

      <h3>Notes</h3>
      <p style={{ whiteSpace:'pre-wrap' }}>{p.notes || '—'}</p>

      <p><a href={`/projects/${p.id}/edit`}>Edit</a> · <a href="/projects">Back to projects</a></p>

      <hr style={{ margin:'24px 0' }} />
      <h2>Submissions</h2>

      {/* Add submission */}
      <div style={{ display:'grid', gap:8, maxWidth:1000, alignItems:'end', gridTemplateColumns:'minmax(220px,1fr) 160px 160px 160px 1fr 100px' }}>
        <div>
          <label>Submitted to</label>
          <select value={selContactId} onChange={e=>setSelContactId(e.target.value)}>
            <option value="">Select a contact</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name}
                {c.companies?.name ? ` — ${c.companies.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Material</label>
          <select value={material} onChange={e=>setMaterial(e.target.value as any)}>
            {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label>Shared on</label>
          <input type="date" value={sentAt} onChange={e=>setSentAt(e.target.value)} />
        </div>

        <div>
          <label>Status</label>
          <select value={subStatus} onChange={e=>setSubStatus(e.target.value as any)}>
            {SUB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label>Feedback</label>
          <textarea rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} />
        </div>

        <div>
          <button onClick={addSubmission} disabled={!selContactId}>Add</button>
        </div>
      </div>

      {/* Existing submissions */}
      {subs.length === 0 ? <p style={{ marginTop:12 }}>No submissions yet.</p> : (
        <div style={{ marginTop:16, display:'grid', gap:8 }}>
          {subs.map(s => {
            const name = s.contact ? `${s.contact.first_name} ${s.contact.last_name ?? ''}`.trim() : '—';
            const company = s.contact?.companies?.name || '';
            const role = s.contact?.role || '';
            const email = s.contact?.email || '';
            return (
              <div key={s.id} style={{ border:'1px solid #ddd', padding:12, borderRadius:8 }}>
                <div style={{ display:'grid', gap:8, gridTemplateColumns:'minmax(220px,1fr) 160px 160px 160px 1fr 80px', alignItems:'center' }}>
                  <div>
                    <strong>
                      {s.contact?.id
                        ? <a href={`/contacts/${s.contact.id}`}>{name}</a>
                        : name}
                    </strong>
                    <div style={{ fontSize:12, opacity:.8 }}>
                      {role ? `${role} · ` : ''}{company || '—'}
                      {email ? <> · <a href={`mailto:${email}`}>{email}</a></> : null}
                    </div>
                  </div>

                  <div>
                    <select value={s.material || ''} onChange={e=>updateSubmission(s.id, { material: e.target.value as any })}>
                      <option value="">—</option>
                      {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <input type="date" value={s.sent_at || ''} onChange={e=>updateSubmission(s.id, { sent_at: e.target.value })} />
                  </div>

                  <div>
                    <select value={s.contact_status || ''} onChange={e=>updateSubmission(s.id, { contact_status: e.target.value as any })}>
                      <option value="">—</option>
                      {SUB_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  <div>
                    <textarea rows={3} value={s.feedback || ''} onChange={e=>updateSubmission(s.id, { feedback: e.target.value })} />
                  </div>

                  <div style={{ textAlign:'right' }}>
                    <button onClick={()=>deleteSubmission(s.id)} style={{ color:'crimson' }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
