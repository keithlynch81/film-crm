'use client';

import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthCtx = {
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] =
    useState<import('@supabase/supabase-js').Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    // Listen for changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
    });
    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
