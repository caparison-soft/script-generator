'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

const DURATIONS = [
  { value: 1,  label: '1 min',  desc: '~150 words' },
  { value: 2,  label: '2 min',  desc: '~300 words' },
  { value: 3,  label: '3 min',  desc: '~450 words' },
  { value: 5,  label: '5 min',  desc: '~750 words' },
  { value: 7,  label: '7 min',  desc: '~1050 words' },
  { value: 10, label: '10 min', desc: '~1500 words' },
  { value: 15, label: '15 min', desc: '~2200 words' },
];

function parseScript(text) {
  // Split into segments by timestamp pattern [MM:SS]
  const parts = text.split(/(\[\d{2}:\d{2}\])/g).filter(Boolean);
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].match(/^\[\d{2}:\d{2}\]$/)) {
      segments.push({ timestamp: parts[i], content: (parts[i + 1] || '').trim() });
      i++;
    }
  }
  return segments.length > 0 ? segments : [{ timestamp: null, content: text }];
}

function ScriptDisplay({ script }) {
  const segments = parseScript(script);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {segments.map((seg, i) => (
        <div key={i} style={{
          padding: '18px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeft: '3px solid rgba(139,92,246,0.5)',
        }}>
          {seg.timestamp && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
              padding: '3px 10px',
              background: 'rgba(139,92,246,0.15)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#a78bfa',
              letterSpacing: '0.08em',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {seg.timestamp}
            </div>
          )}
          <p style={{
            fontSize: '15px',
            lineHeight: 1.75,
            color: '#e4e4ec',
            whiteSpace: 'pre-wrap',
          }}>{seg.content}</p>
        </div>
      ))}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

export default function GeneratorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState(null);
  const [scriptTopic, setScriptTopic] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('with'); // 'with' or 'without'
  const [pricing, setPricing] = useState(null); // { pricingRules: {}, defaultCost: 10 }
  const textareaRef = useRef(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      fetchCredits(session.access_token);
    });
    // Fetch pricing rules
    fetch('/api/pricing').then(r => r.json()).then(data => {
      if (data.ok) setPricing(data);
    }).catch(() => {});
  }, []);

  // Helper to get credit cost for a given duration
  const getCostForDuration = (dur) => {
    if (!pricing) return null;
    if (pricing.pricingRules && pricing.pricingRules[String(dur)] !== undefined) {
      return pricing.pricingRules[String(dur)];
    }
    return pricing.defaultCost || null;
  };

  const fetchCredits = async (token) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_CAPARISON_API_KEY;
      const baseUrl = process.env.NEXT_PUBLIC_CAPARISON_BASE_URL;
      if (!apiKey || apiKey === 'PASTE_YOUR_API_KEY_FROM_ADMIN_PANEL_HERE' || !baseUrl) return;

      const res = await fetch(`${baseUrl}/api/v1/credits`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-User-Token': token,
        },
      });
      const data = await res.json();
      if (data.ok) setCredits(data.credits);
    } catch {}
  };

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setScript(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), duration }),
      });

      if (res.status === 401) {
        window.location.href = `https://www.caparisonlab.com/login?next=${encodeURIComponent(window.location.href)}`;
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        setToast({ message: data.error || 'Generation failed.', type: 'error' });
        return;
      }

      setScript(data.script);
      setScriptTopic(topic.trim());
      setToast({ message: 'Script generated successfully!', type: 'success' });

      // Refresh credits
      const { data: { session } } = await supabase.auth.getSession();
      if (session) fetchCredits(session.access_token);
    } catch (err) {
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyScript = (withTimestamps) => {
    if (!script) return;
    let text = script;
    if (!withTimestamps) {
      text = script.replace(/\[\d{2}:\d{2}\]\s*/g, '').trim();
    }
    navigator.clipboard.writeText(text).then(() => {
      setToast({ message: `Copied ${withTimestamps ? 'with' : 'without'} timestamps!`, type: 'success' });
    });
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/scripts');
      if (res.status === 401) {
        window.location.href = `https://www.caparisonlab.com/login?next=${encodeURIComponent(window.location.href)}`;
        return;
      }
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleHistoryClick = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(v => !v);
  };

  const loadHistoryItem = (item) => {
    setScript(item.scriptText);
    setScriptTopic(item.topic);
    setDuration(item.duration);
    setTopic(item.topic);
    setShowHistory(false);
  };

  const handleGoToDashboard = () => {
    if (confirm("Do you want to go to the dashboard? This app will be closed.")) {
      window.location.href = (process.env.NEXT_PUBLIC_CAPARISON_BASE_URL || 'https://www.caparisonlab.com') + '/dashboard';
    }
  };

  const scriptWithout = script ? script.replace(/\[\d{2}:\d{2}\]\s*/g, '').trim() : '';

  return (
    <main style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,5,10,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(139,92,246,0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>
            Script <span className="gradient-text">Generator</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {credits !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px',
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: '9999px',
              fontSize: '13px', fontWeight: 600, color: '#fbbf24',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
              </svg>
              {credits} credits
            </div>
          )}

          <button onClick={handleHistoryClick} className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h6l3 8 3-8h6"/><path d="M3 21h18"/><line x1="12" y1="11" x2="12" y2="21"/>
            </svg>
            History
          </button>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: user.user_metadata?.avatar_url
                  ? `url(${user.user_metadata.avatar_url}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #6366f1, #a855f7)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: 'white',
              }}>
                {!user.user_metadata?.avatar_url && user.email?.charAt(0).toUpperCase()}
              </div>
              <button onClick={handleGoToDashboard} className="btn btn-ghost btn-sm" style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                Dashboard
              </button>
            </div>
          )}
        </div>
      </header>

      {/* History Dropdown */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: '72px', right: '24px', width: '380px',
          maxHeight: '480px', overflowY: 'auto',
          background: '#0e0e16', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', zIndex: 100, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Recent Scripts</span>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
              No scripts yet. Generate your first one!
            </div>
          ) : (
            history.map(item => (
              <button key={item.id} onClick={() => loadHistoryItem(item)}
                style={{ width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#e4e4ec', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.topic}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{item.duration} min • {new Date(item.createdAt).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <div className="fade-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)', borderRadius: '9999px',
            fontSize: '13px', fontWeight: 600, color: '#a78bfa', marginBottom: '20px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Powered by Gemini AI
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '16px' }}>
            Generate Video Scripts<br/>
            <span className="gradient-text">With Timestamps</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            Create professional, timestamp-structured video scripts for any topic in seconds.
          </p>
        </div>

        {/* Input Card */}
        <div className="glass fade-in-delay-1" style={{ padding: '32px', marginBottom: '32px' }}>
          {/* Topic Input */}
          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">Video Topic / Idea</label>
            <textarea
              ref={textareaRef}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How to start a YouTube channel in 2025, 10 productivity hacks for developers, A beginner's guide to investing..."
              rows={4}
              style={{ padding: '14px 16px', resize: 'vertical', lineHeight: 1.6 }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
              Tip: Be specific for better results. Press Ctrl+Enter to generate.
            </p>
          </div>

          {/* Duration Selector */}
          <div style={{ marginBottom: '28px' }}>
            <label className="input-label">Script Duration</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: duration === d.value ? '1px solid rgba(139,92,246,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: duration === d.value ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.03)',
                    color: duration === d.value ? '#c4b5fd' : 'var(--text-muted)',
                    fontWeight: duration === d.value ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    minWidth: '80px',
                  }}
                >
                  <span>{d.label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>{d.desc}</span>
                  {getCostForDuration(d.value) !== null && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: duration === d.value ? '#fbbf24' : 'rgba(251,191,36,0.6)',
                      display: 'flex', alignItems: 'center', gap: '3px',
                      marginTop: '1px',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
                      </svg>
                      {getCostForDuration(d.value)} cr
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '16px', padding: '16px', position: 'relative', overflow: 'hidden' }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Generating your script...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Generate Script ({duration} min{getCostForDuration(duration) !== null ? ` · ${getCostForDuration(duration)} credits` : ''})
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass fade-in" style={{ padding: '48px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '56px', height: '56px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse-glow 2s infinite',
              }}>
                <div className="spinner-lg" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Writing your script...</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  Gemini is crafting a {duration}-minute script for "{topic}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Script Result */}
        {script && !loading && (
          <div className="fade-in">
            {/* Result Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                  ✦ Your Script
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {duration} min • "{scriptTopic}"
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => copyScript(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ gap: '6px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  Copy with timestamps
                </button>
                <button
                  onClick={() => copyScript(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ gap: '6px', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  Copy without timestamps
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
                {['with', 'without'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                      background: activeTab === tab ? 'rgba(139,92,246,0.25)' : 'transparent',
                      color: activeTab === tab ? '#c4b5fd' : 'var(--text-muted)',
                    }}
                  >
                    {tab === 'with' ? '🕐 With Timestamps' : '📄 Without Timestamps'}
                  </button>
                ))}
              </div>

              {activeTab === 'with' ? (
                <ScriptDisplay script={script} />
              ) : (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '15px',
                  lineHeight: 1.75,
                  color: '#e4e4ec',
                  whiteSpace: 'pre-wrap',
                }}>
                  {scriptWithout}
                </div>
              )}

              {/* Bottom copy row */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => copyScript(activeTab === 'with')} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  Copy {activeTab === 'with' ? 'with' : 'without'} timestamps
                </button>
                <button onClick={handleGenerate} className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
                  </svg>
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  );
}
