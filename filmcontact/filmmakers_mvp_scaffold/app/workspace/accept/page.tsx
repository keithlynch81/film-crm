'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AcceptWorkspaceInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [msg, setMsg] = useState('Accepting invite…');

  useEffect(() => {
    (async () => {
      if (!token) {
        setMsg('Missing token.');
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMsg('Please sign in, then re-open this link.');
        return;
      }

      const { error } = await supabase.rpc('accept_workspace_invite', { token });
      if (error) {
        console.error(error);
        setMsg(error.message);
        return;
      }
      setMsg('Success! You have joined the workspace.');
      setTimeout(() => router.push('/workspace/manage'), 1200);
    })();
  }, [token, router]);

  return (
    <div className="page-container">
      <h1>Workspace Invite</h1>
      <p>{msg}</p>
    </div>
  );
}
