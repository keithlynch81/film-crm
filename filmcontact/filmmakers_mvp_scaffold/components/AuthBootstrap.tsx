
'use client';

import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

async function ensureUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from('users')
    .upsert([{ id: user.id, full_name: (user.user_metadata as any)?.full_name || null }], { onConflict: 'id' });
  if (error) {
    console.warn('Profile upsert failed:', error.message);
  }
  return true;
}

export default function AuthBootstrap() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let canceled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (pathname !== '/login') router.replace('/login');
      } else {
        if (!canceled) await ensureUserProfile();
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await ensureUserProfile();
        if (pathname === '/login') router.replace('/');
      } else {
        if (pathname !== '/login') router.replace('/login');
      }
    });

    return () => {
      canceled = true;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  return null;
}
