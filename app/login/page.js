'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(139,92,246,0.4)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Script <span className="gradient-text">Generator</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>
            AI-powered video scripts with timestamps.<br/>
            Powered by Caparison Lab.
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Sign in to continue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
            Use your Caparison Lab account to log in. Credits are shared with the main platform.
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '14px',
              color: '#f87171',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '15px', padding: '14px' }}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-dim)', marginTop: '20px' }}>
            By signing in, you agree to use your Caparison Lab credits.
          </p>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a 
            href={process.env.NEXT_PUBLIC_CAPARISON_URL || 'https://caparison-lab.vercel.app'}
            style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            ← Back to Caparison Lab
          </a>
        </div>
      </div>
    </main>
  );
}
