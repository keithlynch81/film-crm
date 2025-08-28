// /lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    // We deliberately pick a stable custom key so we can see it in DevTools:
    storageKey: 'sb-custom-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
