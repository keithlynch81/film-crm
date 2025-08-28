'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Medium = { id:number; name:string };
type Genre  = { id:number; name:string };
type Budget = { id:number; label:string; unit:'total'|'per_episode'; medium_id:number };

type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  email: string | null;
  tags: string[] | null;
  remit_notes: string | null;
  taste_notes: string | null;
  additional_notes: string | null;
  companies: { id:string; name:string|null } | null;
  contact_mediums: { medium_id:number }[] | null;
  contact_genres: { genre_id:number }[] | null;
  contact_budget_ranges: { budget_range_id:number }[] | null;
};

type Meeting = {
  id: string;
  scheduled_at: string | null;
  follow_up_due: string | null;
  meeting_type: string | null;
  notes: string | null;
};

type Submission = {
  id: string;
  submitted_at: string | null;
  status: string | null;
  material: string | null;
  notes: string | null;
  projects: { id:string; title:string } | null;
};

function budgetLabel(b:Budget){
  return b.unit==='per_episode' ? `${b.label.replace(/\s*ep$/i,'')} (per ep)` : b.label;
}

export default function ContactDetailPage() {
  const params = useParams<{ id:string }>();
  const id = params.id;
  const { activeWorkspaceId } = useWorkspace();

  const [c, setC] = useState<Contact|null>(null);
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [genres, setGenres]   = useState<Genre[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  // add meeting
  const [mtgType, setMtgType] = useState('');
  const [mtgWhen, setMtgWhen] = useState('');
  const [mtgFollow, setMtgFollow] = useState('');
  const [mtgNotes, setMtgNotes] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const [{ data: cc, error: ce }, { data: ms }, { data: gs }, { data: bs }] = await Promise.all([
          supabase
            .from('contacts')
            .select(`
              id, first_name, last_name, role, email, tags, remit_notes, taste_notes, additional_notes,
              companies ( id, name ),
              contact_mediums ( medium_id ),
              contact_genres ( genre_id ),
              contact_budget_ranges ( budget_range_id )
            `)
            .eq('id', id).single(),
          supabase.from('mediums').select('id,name').order('name'),
          supabase.from('genres').select('id,name').order('name'),
          supabase.from('budget_ranges').select('id,label,unit,medium_id').order('medium_id').order('id'),
        ]);
        if (ce) throw ce;

        const [{ data: ms2 }, { data: ss }] = await Promise.all([
          supabase
            .from('meetings')
            .select('id, scheduled_at, follow_up_due, meeting_type, notes')
            .eq('contact_id', id)
            .order('scheduled_at', { ascending:false }),
          supabase
            .from('submissions')
            .select(`
              id, submitted_at, status, material, notes,
              projects:projects ( id, title )
            `)
            .eq('contact_id', id)
            .order('submitted_at', { ascending:false })
        ]);

        if (!alive) return;
        setC(cc as any);
        setMediums(ms ?? []); setGenres(gs ?? []); setBudgets(bs ?? []);
        setMeetings((ms2 as any) ?? []);
        setSubs((ss as any) ?? []);
      } catch (e:any) {
        if (!alive) return;
        setError(e.message || 'Failed to load contact');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const maps = useMemo(() => ({
    m: new Map(mediums.map(x=>[x.id,x.name])),
    g: new Map(genres.map(x=>[x.id,x.name])),
    b: new Map(budgets.map(x=>[x.id,budgetLabel(x)])),
  }), [mediums, genres, budgets]);

  async function addMeeting() {
    try {
      if (!activeWorkspaceId) { alert('Pick a workspace'); return; }
      const payload = {
        workspace_id: activeWorkspaceId,
        contact_id: id,
        scheduled_at: mtgWhen ? new Date(mtgWhen).toISOString() : null,
        follow_up_due: mtgFollow ? new Date(mtgFollow).toISOString() : null,
        meeting_type: mtgType || null,
        notes: mtgNotes || null,
      };
      const { error } = await supabase.from('meetings').insert(payload);
      if (error) throw error;
      setMtgType(''); setMtgWhen(''); setMtgFollow(''); setMtgNotes('');
      const { data: ms2 } = await supabase
        .from('meetings')
        .select('id, scheduled_at, follow_up_due, meeting_type, notes')
        .eq('contact_id', id)
        .order('scheduled_at', { ascending:false });
      setMeetings((ms2 as any) ?? []);
    } catch (e:any) {
      alert(e.message || 'Failed to add meeting');
    }
  }

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color:'crimson' }}>Error: {error}</div>;
  if (!c)      return <div>Not found.</div>;

  const pretty = (s?:string|null) => s ? s : '—';

  return (
    <div>
      <h1>{c.first_name} {c.last_name}</h1>

      <div style={{ marginBottom: 12 }}>
        <Link href={`/contacts/${c.id}/edit`}>Edit contact</Link>
      </div>

      {/* Read-only summary */}
      <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, marginBottom:16 }}>
        <div><strong>Company:</strong> {c.companies?.name || '—'} {c.role ? `(${c.role})` : ''}</div>
        <div><strong>Email:</strong> {c.email || '—'}</div>
        <div><strong>Mediums:</strong> {(c.contact_mediums||[]).map(x=>maps.m.get(x.medium_id)||x.medium_id).join(', ') || '—'}</div>
        <div><strong>Genres:</strong>  {(c.contact_genres||[]).map(x=>maps.g.get(x.genre_id)||x.genre_id).join(', ') || '—'}</div>
        <div><strong>Budgets:</strong> {(c.contact_budget_ranges||[]).map(x=>maps.b.get(x.budget_range_id)||x.budget_range_id).join(', ') || '—'}</div>
        <div><strong>Tags:</strong> {(c.tags||[]).map(t=>'#'+t).join(' ') || '—'}</div>

        <div style={{ marginTop:8 }}>
          <div style={{ fontWeight:600 }}>Remit</div>
          <div>{pretty(c.remit_notes)}</div>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontWeight:600 }}>Personal tastes</div>
          <div>{pretty(c.taste_notes)}</div>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontWeight:600 }}>Additional notes</div>
          <div>{pretty(c.additional_notes)}</div>
        </div>
      </div>

      {/* Add meeting */}
      <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Add meeting</div>
        <div style={{ display:'grid', gap:8, maxWidth:700 }}>
          <input placeholder="Type (e.g., Intro, Pitch, Notes)" value={mtgType} onChange={e=>setMtgType(e.target.value)} />
          <label>When (UTC)
            <input type="datetime-local" value={mtgWhen} onChange={e=>setMtgWhen(e.target.value)} />
          </label>
          <label>Follow-up due (UTC)
            <input type="datetime-local" value={mtgFollow} onChange={e=>setMtgFollow(e.target.value)} />
          </label>
          <textarea placeholder="Notes" rows={2} value={mtgNotes} onChange={e=>setMtgNotes(e.target.value)} />
          <div><button onClick={addMeeting}>Save meeting</button></div>
        </div>

        <div style={{ marginTop:16, fontWeight:600 }}>Meetings</div>
        {!meetings.length ? <div>(none)</div> : (
          <ul style={{ display:'grid', gap:8, marginTop:6 }}>
            {meetings.map(m => (
              <li key={m.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8 }}>
                <div>{m.meeting_type || '—'} • {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}</div>
                {m.follow_up_due ? <div>Follow-up: {new Date(m.follow_up_due).toLocaleString()}</div> : null}
                {m.notes ? <div style={{ opacity:.8 }}>{m.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Submissions to this contact */}
      <div style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginTop:16 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Submissions to this contact</div>
        {!subs.length ? <div>(none)</div> : (
          <ul style={{ display:'grid', gap:8 }}>
            {subs.map(s => (
              <li key={s.id} style={{ border:'1px solid #eee', borderRadius:8, padding:8 }}>
                <div>
                  <strong>Project:</strong> {s.projects ? <Link href={`/projects/${s.projects.id}`}>{s.projects.title}</Link> : '(deleted)'}
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
