'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';

export default function ExtensionCallback() {
  const [status, setStatus] = useState<'loading' | 'login' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if there are auth tokens in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      let session = null;

      // If we have tokens in the URL, use them
      if (accessToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          console.error('Error setting session from hash:', error);
        } else {
          session = data.session;
        }
      }

      // If no tokens in URL, try to get existing session
      if (!session) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        session = currentSession;
      }

      if (session) {
        await sendToExtension(session);
      } else {
        // Show login form
        setStatus('login');
        setMessage('Please log in to connect your extension');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setStatus('login');
      setMessage('Please log in to connect your extension');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        await sendToExtension(data.session);
      }
    } catch (error: any) {
      setMessage(error.message || 'Login failed');
      setIsLoggingIn(false);
    }
  };

  const sendToExtension = async (session: any) => {
    const state = searchParams.get('state');

    if (!state) {
      setStatus('error');
      setMessage('Invalid authentication state.');
      return;
    }

    // Send tokens to the extension
    const chromeApi = (window as any).chrome;

    if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
      // We're in a Chrome extension context
      chromeApi.runtime.sendMessage({
        type: 'EXTENSION_AUTH_SUCCESS',
        state,
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }, (response: any) => {
        if (chromeApi.runtime.lastError) {
          console.error('Extension message error:', chromeApi.runtime.lastError);
        }
      });

      setStatus('success');
      setMessage('Authentication successful! You can close this window.');

      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      // Fallback: try to communicate via window.opener
      if (window.opener) {
        window.opener.postMessage({
          type: 'EXTENSION_AUTH_SUCCESS',
          state,
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }, '*');

        setStatus('success');
        setMessage('Authentication successful! You can close this window.');

        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Cannot communicate with extension. Please try again.');
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#111827' }}>
              Authenticating...
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {message}
            </p>
          </>
        )}

        {status === 'login' && (
          <>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#111827' }}>
              🎬 Film CRM Extension
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Sign in to connect your extension
            </p>

            <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="••••••••"
                />
              </div>

              {message && (
                <div style={{
                  fontSize: '13px',
                  color: '#dc2626',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: isLoggingIn ? '#93c5fd' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: 'white'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#111827' }}>
              Success!
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: 'white'
            }}>
              ✕
            </div>
            <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#111827' }}>
              Error
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {message}
            </p>
            <button
              onClick={() => window.close()}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
