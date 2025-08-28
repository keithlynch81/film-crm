'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Workspace = { id: string; name: string; role: string };

type Ctx = {
  status: 'loading' | 'ok' | 'no-auth' | 'error';
  error?: string | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  refreshWorkspaces: () => Promise<void>;
};

const WorkspaceContext = createContext<Ctx>({
  status: 'loading',
  workspaces: [],
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
  refreshWorkspaces: async () => {},
});

const ACTIVE_KEY = 'fc.activeWorkspaceId';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Ctx['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, _setActiveWorkspaceId] = useState<string | null>(null);

  // read stored active on first mount
  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    if (saved) _setActiveWorkspaceId(saved);
  }, []);

  const setActiveWorkspaceId = (id: string | null) => {
    _setActiveWorkspaceId(id);
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  };

  // Helper: fetch memberships -> workspaces
  const fetchWorkspaces = async () => {
    // use authenticated membership join (RLS will ensure only your rows)
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role, workspace_id, workspaces ( id, name )')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const ws: Workspace[] =
      (data || []).map((row: any) => ({
        id: row.workspaces.id,
        name: row.workspaces.name,
        role: row.role,
      })) ?? [];

    // dedupe just in case
    const map = new Map<string, Workspace>();
    ws.forEach(w => map.set(w.id, w));
    return Array.from(map.values());
  };

  const refreshWorkspaces = async () => {
    setStatus('loading');
    setError(null);

    // Ensure we really have a session
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setStatus('no-auth');
      setWorkspaces([]);
      return;
    }

    try {
      const ws = await fetchWorkspaces();
      setWorkspaces(ws);

      // pick a default if none
      if (!activeWorkspaceId && ws.length) {
        setActiveWorkspaceId(ws[0].id);
      } else if (activeWorkspaceId && ws.length && !ws.some(w => w.id === activeWorkspaceId)) {
        // stored one no longer valid
        setActiveWorkspaceId(ws[0].id);
      }

      setStatus('ok');
    } catch (e: any) {
      setError(e.message || String(e));
      setStatus('error');
    }
  };

  // boot + auth state changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!s.session) {
        setStatus('no-auth');
        setWorkspaces([]);
      } else {
        await refreshWorkspaces();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setStatus('no-auth');
        setWorkspaces([]);
        setActiveWorkspaceId(null);
      } else {
        refreshWorkspaces();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      status,
      error,
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      refreshWorkspaces,
    }),
    [status, error, workspaces, activeWorkspaceId]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
