'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';

export default function ExtensionCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
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

        // If no tokens in URL, try to get existing session with retries
        if (!session) {
          let attempts = 0;
          const maxAttempts = 5;

          while (!session && attempts < maxAttempts) {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();

            if (currentSession) {
              session = currentSession;
              break;
            }

            // Wait a bit before retrying
            if (attempts < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            attempts++;
          }
        }

        if (!session) {
          setStatus('error');
          setMessage('No active session found. Please click the button below to authenticate.');
          return;
        }

        // Get the state parameter
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
          setMessage('Authentication successful! You can close this tab.');

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
            setMessage('Authentication successful! You can close this tab.');

            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Cannot communicate with extension. Please try again.');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    };

    handleAuth();
  }, [supabase, searchParams]);

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
        maxWidth: '400px'
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
              Authentication Required
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  const state = searchParams.get('state');
                  const redirectUrl = `/extension-callback${state ? `?state=${state}` : ''}`;
                  window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}${state ? `&state=${state}` : ''}`;
                }}
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
                Log In
              </button>
              <button
                onClick={() => window.close()}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
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
