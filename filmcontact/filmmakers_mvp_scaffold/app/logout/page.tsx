'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        router.replace('/projects');
      }
    })();
  }, [router]);
  return <div>Signing out…</div>;
}
