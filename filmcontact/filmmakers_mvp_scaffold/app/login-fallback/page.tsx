'use client';
import { useState } from 'react';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export default function LoginFallback() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error_description || data?.message || 'Login failed');

      localStorage.setItem('sb-custom-auth', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: { id: data.user?.id },
      }));

      window.location.href = '/';
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Sign in (fallback)</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
