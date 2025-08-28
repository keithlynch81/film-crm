'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Project = {
  id: string;
  title: string;
  logline: string | null;
  notes: string | null;
  status: string | null;
  stage: string | null;
  tags: string[] | null;
  medium_id: number | null;
  budget_range_id: number | null;
  project_genres: { genre_id:number }[] | null;
};
type Medium = { id:number; name:string };
type Genre  = { id:number; name:string };
type Budget = { id:number; label:string; unit:'total'|'per_episode'; medium_id:number };
type ContactLite = { id:string; first_name:string|null; last_name:string|null; companies?:{name:string|null}|null };
type Submission = {
  id: string;
  submitted_at: string | null;
  status: string | null;
  material: string | null;
  notes: string | null;
  contacts: ContactLite | null;
};

function budgetLabel(b:Budget){
  return b.unit==='per_episode' ? `${b.label.replace(/\s*ep$/i,'')} (per ep)` : b.label;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id:string }>();
  const id = params.id;
  const { activeWorkspaceId } = useWorkspace();

  const [p, setP] = useState<Project|null>(null);
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [genres, setGenres]   = useState<Genre[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [subs, setSubs]       = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  // add submission
  const [q, setQ] = useState('');
  const [choices, setChoices] = useState<ContactLite[]>([]);
  const [contactId, setContactId] = useState('');
  const [material, setMaterial]   = useState('');
  const [status, setStatus]       = useState('');
  const [snotes, setSnotes]       = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const [{ data: proj, error: pe }, { data: ms }, { data: gs }, { data: bs }] = await Promise.all([
          supabase
            .from('projects')
            .select(`
              id, title, logline, notes, status, stage, tags, medium_id, budget_range_id,
              project_genres ( genre_id )
            `)
            .eq('id', id).single(),
          supabase.from('mediums').select('id,name').order('name'),
          supabase.from('genres').select('id,name').order('name'),
          supabase.from('budget_ranges').select('id,label,unit,medium_id').order('medium_id').order('id'),
        ]);
        if (pe) throw pe;
        const { data: s } = await supabase
          .from('submissions')
          .select(`
            id, submitted_at, status, material, notes,
            contacts:contacts ( id, first_name, last_name, companies ( name ) )
          `)
          .eq('project_id', id)
          .order('submitted_at', { ascending:false });

        if (!alive) return;
        setP(proj as any);
        setMediums(ms ?? []); setGenres(gs ?? []); setBudgets(bs ?? []);
        setSubs((s as any) ?? []);
      } catch (e:any) {
        if (!alive) return;
        setError(e.message || 'Failed to load project');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeWorkspaceId || !q.trim()) { setChoices([]); return; }
      const { data } = await supabase
        .from('contacts')
      .select('id, first_name, last_name, companies ( name )')
        .eq('workspace_id', activeWorkspaceId)
        .ilike('first_name', `%${q}%`)
        .limit(10);
      if (alive) setChoices((data as any) ?? []);
    })();
    return () => { alive = false; };
  }, [q, activeWorkspaceId]);

  const maps = useMemo(() => ({
    m: new Map(mediums.map(x=>[x.id,x.name])),
    g: new Map(genres.map(x=>[x.id,x.name])),
    b: new Map(budgets.map(x=>[x.id,budgetLabel(x)])),
  }), [mediums, genres, budgets]);

  async function addSubmission() {
    try {
      if (!activeWorkspaceId) { alert('Pick a workspace'); return; }
      if (!contactId) { alert('Choose a contact'); return; }
      const { error } = await supabase.from('submissions').insert({
        workspace_id: activeWorkspaceId,
        project_id: id,
        contact_id: contactId,
        status: status || null,
        material: material || null,
        notes: snotes || null,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
      setContactId(''); setQ(''); setStatus(''); setMaterial(''); setSnotes('');
      const { data: s } = await supabase
        .from('submissions')
        .select(`
          id, submitted_at, status, material, notes,
          contacts:contacts ( id, first_name, last_name, companies ( name ) )
        `)
        .eq('project_id', id)
        .order('submitted_at', { ascending:false });
      setSubs((s as any) ?? []);
    } catch (e:any) {
      alert(e.message || 'Failed to add submission');
    }
  }

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color:'crimson' }}>Error: {error}</div>;
  if (!p)      return <div>Not found.</div>;

  const pretty = (s?:string|null) => s ? s : '—';

  return (
    <div>
      <h1>{p.title}</h1>

      <div style={{ marginBottom: 12 }}>
        <Link href={`/projects/${p.id}/edit`}>Edit project</Link>
      </div>

      {/* Read-only summary */}
      <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, marginBottom:16 }}>
        <div><strong>Status:</strong> {pretty(p.status)} <strong>Stage:</strong> {pretty(p.stage)}</div>
        <div><strong>Medium:</strong> {p.medium_id ? (maps.m.get(p.medium_id) || p.medium_id) : '—'}</div>
        <div><strong>Budget:</strong> {p.budget_range_id ? (maps.b.get(p.budget_range_id) || p.budget_range_id) : '—'}</div>
        <div><strong>Genres:</strong> {(p.project_genres||[]).map(g=>maps.g.get(g.genre_id)||g.genre_id).join(', ') || '—'}</div>
        <div><strong>Tags:</strong> {(p.tags||[]).map(t=>'#'+t).join(' ') || '—'}</div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontWeight:600 }}>Logline</div>
          <div>{pretty(p.logline)}</div>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontWeight:600 }}>Notes</div>
          <div>{pretty(p.notes)}</div>
        </div>
      </div>

      {/* Add submission */}
      <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Add submission</div>
        <div style={{ display:'grid', gap:8, maxWidth:700 }}>
          <input placeholder="Search contact…" value={q} onChange={e=>setQ(e.target.value)} />
          {choices.length > 0 && (
            <select value={contactId} onChange={e=>setContactId(e.target.value)}>
              <option value="">Choose…</option>
              {choices.map(c => (
                <option key={c.id} value={c.id}>
                  {(c.first_name||'') + ' ' + (c.last_name||'')} {c.companies?.name ? `— ${c.companies.name}` : ''}
                </option>
              ))}
            </select>
          )}
          <input placeholder="Material (e.g., Deck, Script)" value={material} onChange={e=>setMaterial(e.target.value)} />
          <input placeholder="Status (e.g., OUTSTANDING, PASS, MEETING, SALE)" value={status} onChange={e=>setStatus(e.target.value)} />
          <textarea placeholder="Notes / Feedback" rows={2} value={snotes} onChange={e=>setSnotes(e.target.value)} />
          <div><button onClick={addSubmission}>Save submission</button></div>
        </div>

        <div style={{ marginTop:16, fontWeight:600 }}>Submissions</div>
        {!subs.length ? <div>(none)</div> : (
          <ul style={{ display:'grid', gap:8, marginTop:6 }}>
            {subs.map(s => (
              <li key={s.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8 }}>
                <div>
                  <strong>{s.contacts ? `${s.contacts.first_name||''} ${s.contacts.last_name||''}` : '(unknown)'}</strong>
                  {s.contacts?.companies?.name ? ` — ${s.contacts.companies.name}` : ''}
                </div>
                <div>{s.status || '—'}{s.material ? ` • ${s.material}` : ''}{s.submitted_at ? ` • ${new Date(s.submitted_at).toLocaleDateString()}` : ''}</div>
                {s.notes ? <div style={{ opacity:.8 }}>{s.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
