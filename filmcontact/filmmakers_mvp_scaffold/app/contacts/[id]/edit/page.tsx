'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
function parseTags(s:string){ return Array.from(new Set(s.split(/[\s,]+/).map(normTag).filter(Boolean))); }
function budgetLabel(b:Budget){ return b.unit==='per_episode' ? `${b.label.replace(/\s*ep$/i,'')} (per ep)` : b.label; }

export default function EditContactPage() {
  const params = useParams<{ id:string }>();
  const id = params.id;
  const router = useRouter();

  const [first, setFirst] = useState(''); 
  const [last,  setLast]  = useState('');
  const [company, setCompany] = useState('');
  const [role,  setRole]  = useState('');
  const [email, setEmail] = useState('');
  const [remit, setRemit] = useState('');
  const [taste, setTaste] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [selMediums, setSelMediums] = useState<number[]>([]);
  const [selGenres,  setSelGenres]  = useState<number[]>([]);
  const [selBudgets, setSelBudgets] = useState<number[]>([]);

  const [mediums, setMediums] = useState<Medium[]>([]);
  const [genres,  setGenres]  = useState<Genre[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const visibleBudgets = useMemo(
    () => budgets.filter(b => selMediums.length === 0 ? false : selMediums.includes(b.medium_id)),
    [budgets, selMediums]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: ms }, { data: gs }, { data: bs }, { data: c, error: ce }] = await Promise.all([
        supabase.from('mediums').select('id,name').order('name'),
        supabase.from('genres').select('id,name').order('name'),
        supabase.from('budget_ranges').select('id,label,unit,medium_id').order('medium_id').order('id'),
        supabase
          .from('contacts')
          .select(`
            first_name,last_name,role,email,tags,remit_notes,taste_notes,additional_notes,
            companies ( name ),
            contact_mediums ( medium_id ),
            contact_genres ( genre_id ),
            contact_budget_ranges ( budget_range_id )
          `)
          .eq('id', id)
          .single()
      ]);
      if (ce) { alert(ce.message); return; }
      if (!alive) return;
      setMediums(ms ?? []); setGenres(gs ?? []); setBudgets(bs ?? []);
      setFirst(c.first_name || ''); setLast(c.last_name || '');
      setCompany(c.companies?.name || ''); setRole(c.role || ''); setEmail(c.email || '');
      setRemit(c.remit_notes || ''); setTaste(c.taste_notes || ''); setNotes(c.additional_notes || '');
      setTagsInput((c.tags || []).map((t:string)=>'#'+t).join(' '));
      setSelMediums((c.contact_mediums||[]).map((x:any)=>x.medium_id));
      setSelGenres((c.contact_genres||[]).map((x:any)=>x.genre_id));
      setSelBudgets((c.contact_budget_ranges||[]).map((x:any)=>x.budget_range_id));
    })();
    return () => { alive = false; };
  }, [id]);

  async function upsertCompany(name:string): Promise<string|null> {
    const n = name.trim();
    if (!n) return null;
    const { data: ex } = await supabase.from('companies').select('id').ilike('name', n).limit(1).maybeSingle();
    if (ex?.id) return ex.id;
    const { data, error } = await supabase.from('companies').insert({ name:n }).select('id').single();
    if (error) throw error;
    return data!.id;
  }

  async function onSave() {
    try {
      const tags = parseTags(tagsInput);
      const company_id = await upsertCompany(company);
      const { error } = await supabase
        .from('contacts')
        .update({
          first_name: first || null,
          last_name:  last || null,
          role: role || null,
          email: email || null,
          company_id,
          remit_notes: remit || null,
          taste_notes: taste || null,
          additional_notes: notes || null,
          tags
        })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('contact_mediums').delete().eq('contact_id', id);
      await supabase.from('contact_genres').delete().eq('contact_id', id);
      await supabase.from('contact_budget_ranges').delete().eq('contact_id', id);

      if (selMediums.length) await supabase.from('contact_mediums').insert(selMediums.map(m => ({ contact_id: id, medium_id: m })));
      if (selGenres.length)  await supabase.from('contact_genres').insert(selGenres.map(g => ({ contact_id: id, genre_id: g })));
      if (selBudgets.length) await supabase.from('contact_budget_ranges').insert(selBudgets.map(b => ({ contact_id: id, budget_range_id: b })));

      router.push(`/contacts/${id}`);
    } catch (e:any) {
      alert(e.message || 'Failed to save');
    }
  }

  function toggleNum(id:number, arr:number[], set:(v:number[])=>void) {
    set(arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id]);
  }

  return (
    <div>
      <h1>Edit contact</h1>

      <div style={{ display:'grid', gap:10, maxWidth:900 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input placeholder="First name" value={first} onChange={e=>setFirst(e.target.value)} />
          <input placeholder="Last name"  value={last}  onChange={e=>setLast(e.target.value)} />
          <input placeholder="Company"    value={company} onChange={e=>setCompany(e.target.value)} />
          <input placeholder="Role"       value={role}  onChange={e=>setRole(e.target.value)} />
          <input placeholder="Email"      value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <textarea placeholder="Remit / commissioning notes" rows={2} value={remit} onChange={e=>setRemit(e.target.value)} />
        <textarea placeholder="Personal tastes" rows={2} value={taste} onChange={e=>setTaste(e.target.value)} />
        <textarea placeholder="Additional notes" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} />

        <div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Mediums</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {mediums.map(m => {
              const on = selMediums.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={()=>toggleNum(m.id, selMediums, setSelMediums)} style={pill(on)}>
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {visibleBudgets.length > 0 && (
          <div>
            <div style={{ fontWeight:600, marginBottom:4 }}>Budgets</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {visibleBudgets.map(b => {
                const on = selBudgets.includes(b.id);
                return (
                  <button key={b.id} type="button" onClick={()=>toggleNum(b.id, selBudgets, setSelBudgets)} style={pill(on)}>
                    {budgetLabel(b)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Genres</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {genres.map(g => {
              const on = selGenres.includes(g.id);
              return (
                <button key={g.id} type="button" onClick={()=>toggleNum(g.id, selGenres, setSelGenres)} style={pill(on)}>
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <input
            placeholder="Type #tags… then Enter/Space/Comma"
            value={tagsInput}
            onChange={e=>setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (['Enter',' ',','].includes(e.key)) {
                e.preventDefault();
                const tags = parseTags(tagsInput);
                setTagsInput(tags.map(t=>'#'+t).join(' ') + ' ');
              }
            }}
          />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onSave}>Save</button>
          <button type="button" onClick={()=>history.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
