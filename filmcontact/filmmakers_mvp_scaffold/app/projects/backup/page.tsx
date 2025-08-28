'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Project = { id: string; title: string; format: string | null };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id,title,format')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setProjects(data ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || String(e));
        console.error('projects list load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color: 'crimson' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Projects</h1>
      <a href="/projects/new">Add project</a>
      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {projects.map(p => (
            <li key={p.id}>
              {p.title} {p.format ? `— ${p.format}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
