'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/components/workspace/WorkspaceProvider';

type Medium = { id:number; name:string };
type Genre  = { id:number; name:string };
type Budget = { id:number; label:string; unit:'total'|'per_episode'; medium_id:number };

function pill(on:boolean): React.CSSProperties {
  return {
    border: '1px solid',
    borderColor: on ? '#93c5fd' : '#ccc',
    borderRadius: 16,
    padding: '6px 12px',
    background: on ? '#e0f2fe' : '#fff',
    cursor: 'pointer',
  };
}
function normTag(raw:string){
  const t = raw.trim().replace(/^#/,'').toLowerCase().replace(/[^a-z0-9-]/g,'-');
  return t.replace(/-+/g,'-').replace(/^-|-$/g,'');
}
function parseTagsInput(s:string){ return Array.from(new Set(s.split(/[\s,]+/).map(normTag).filter(Boolean))); }
function budgetLabel(b:Budget){
  if (b.unit === 'per_episode') {
    // remove a trailing " ep" if present in label (just in case), then add suffix
    const cleaned = b.label.replace(/\s*ep$/i,'');
    return `${cleaned} (per ep)`;
  }
  return b.label;
}

export default function NewProjectPage() {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();

  const [mediums, setMediums] = useState<Medium[]>([]);
  const [genres,  setGenres]  = useState<Genre[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [title, setTitle]     = useState('');
  const [logline, setLogline] = useState('');
  const [notes, setNotes]     = useState('');
  const [status, setStatus]   = useState('');
  const [stage,  setStage]    = useState('');

  // single medium + single budget per schema
  const [medium, setMedium] = useState<number|''>('');
  const [budget, setBudget] = useState<number|''>('');
  const [selGenres, setSelGenres] = useState<number[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  const allTags = useMemo(() => {
    // suggestion list from existing projects
    return [] as string[];
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: ms }, { data: gs }, { data: bs }] = await Promise.all([
        supabase.from('mediums').select('id,name').order('name'),
        supabase.from('genres').select('id,name').order('name'),
        supabase.from('budget_ranges').select('id,label,unit,medium_id').order('medium_id').order('id'),
      ]);
      if (!alive) return;
      setMediums(ms ?? []); setGenres(gs ?? []); setBudgets(bs ?? []);
    })();
    return () => { alive = false; };
  }, []);

  const budgetsForMedium = useMemo(
    () => (typeof medium === 'number') ? budgets.filter(b => b.medium_id === medium) : [],
    [budgets, medium]
  );

  async function onSave() {
    try {
      if (!activeWorkspaceId) { alert('Pick a workspace first.'); return; }
      if (!title.trim()) { alert('Title is required.'); return; }
      const tags = parseTagsInput(tagsInput);

      const { data: created, error } = await supabase
        .from('projects')
        .insert({
          workspace_id: activeWorkspaceId,
          title: title.trim(),
          logline: logline.trim() || null,
          notes: notes.trim() || null,
          status: status || null,
          stage: stage || null,
          medium_id: medium || null,
          budget_range_id: budget || null,
          tags
        })
        .select('id')
        .single();
      if (error) throw error;

      if (selGenres.length) {
        const rows = selGenres.map(gid => ({ project_id: created!.id, genre_id: gid }));
        const { error: ge } = await supabase.from('project_genres').insert(rows);
        if (ge) throw ge;
      }

      router.push(`/projects/${created!.id}`);
    } catch (e:any) {
      alert(e.message || 'Failed to save project');
    }
  }

  return (
    <div>
      <h1>New project</h1>

      <div style={{ display:'grid', gap:10, maxWidth:900 }}>
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea placeholder="Logline" rows={2} value={logline} onChange={e=>setLogline(e.target.value)} />

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <label>Status:
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{ marginLeft:6 }}>
              <option value="">—</option>
              {['AVAILABLE','OPTIONED','SOLD','IN DEVELOPMENT','IN PRODUCTION','PRODUCED','RELEASED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Stage:
            <select value={stage} onChange={e=>setStage(e.target.value)} style={{ marginLeft:6 }}>
              <option value="">—</option>
              {['IDEA','ONE PAGER','TREATMENT','MINI DECK','DECK','DRAFT','FINAL DRAFT'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {/* Medium pills (single-select) */}
        <div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Medium</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {mediums.map(m => {
              const on = medium === m.id;
              return (
                <button key={m.id} type="button" onClick={() => setMedium(on ? '' : m.id)} style={pill(on)}>
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budgets (under medium) */}
        {typeof medium === 'number' && (
          <div>
            <div style={{ fontWeight:600, marginBottom:4 }}>Budget</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {budgetsForMedium.map(b => {
                const on = budget === b.id;
                return (
                  <button key={b.id} type="button" onClick={() => setBudget(on ? '' : b.id)} style={pill(on)}>
                    {budgetLabel(b)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Genres (pills with light-blue highlight) */}
        <div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Genres</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {genres.map(g => {
              const on = selGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelGenres(prev => on ? prev.filter(x=>x!==g.id) : [...prev, g.id])}
                  style={pill(on)}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags with # support */}
        <div>
          <input
            placeholder="Type #tags… then Enter/Space/Comma"
            value={tagsInput}
            onChange={e=>setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (['Enter',' ',','].includes(e.key)) {
                e.preventDefault();
                const tags = parseTagsInput(tagsInput);
                setTagsInput(tags.map(t=>'#'+t).join(' ') + ' ');
              }
            }}
          />
          {allTags.length ? (
            <div style={{ marginTop:6, display:'flex', gap:8, flexWrap:'wrap' }}>
              {allTags.map(t => (
                <button key={t} type="button"
                  onClick={()=>setTagsInput(prev => (prev ? prev+' ' : '') + '#'+t+' ')}
                  style={{ border:'1px solid #ccc', borderRadius:16, padding:'2px 8px', background:'#f8fafc' }}>
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <textarea placeholder="Notes" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} />

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onSave}>Save</button>
          <button type="button" onClick={()=>history.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
