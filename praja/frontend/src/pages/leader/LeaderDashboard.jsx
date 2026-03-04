import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const NAV = [
  { id: 'brief',   emoji: '☀️', label: 'Morning Brief' },
  { id: 'alerts',  emoji: '🚨', label: 'Alerts' },
  { id: 'nayakai', emoji: '🤖', label: 'NayakAI' },
  { id: 'heatmap', emoji: '🗺️', label: 'Heatmap' },
]

export default function LeaderDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('brief')
  const [brief, setBrief] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiMode, setAiMode] = useState('summarize')
  const [aiOut, setAiOut] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { loadBrief() }, [])
  useEffect(() => { if (tab === 'alerts') loadAlerts() }, [tab])

  const loadBrief = async () => {
    try {
      const { data } = await api.post('/nayakai/morning-brief', {
        constituency: user?.constituency || 'My Constituency',
        date: new Date().toISOString().split('T')[0],
      })
      setBrief(data)
    } catch (e) { console.error(e) }
  }

  const loadAlerts = async () => {
    try {
      const { data } = await api.get('/sentinel/alerts')
      setAlerts(data.alerts || [])
    } catch (e) { console.error(e) }
  }

  const runAI = async () => {
    if (!aiInput.trim()) return
    setLoading(true); setAiOut('')
    try {
      let res
      if (aiMode === 'summarize') {
        res = await api.post('/nayakai/summarize', { text: aiInput })
        setAiOut(res.data.summary)
      } else if (aiMode === 'speech') {
        res = await api.post('/nayakai/speech', { event_type: 'event', key_points: aiInput.split('\n').filter(Boolean), language: 'english' })
        setAiOut(res.data.speech)
      } else {
        res = await api.post('/nayakai/letter', { issue_type: 'Issue', context: aiInput, recipient: 'District Collector', sender_title: 'MLA' })
        setAiOut(res.data.letter)
      }
    } catch (e) { setAiOut('Error: ' + e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Tricolor strip */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>PRAJA — Leader Portal</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem' }}>🏛️ {user?.name || user?.full_name}</div>
          </div>
        </div>
        <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem' }}>
          Sign Out
        </button>
      </div>

      {/* Tab nav */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', overflowX: 'auto', padding: '0 16px' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            padding: '13px 20px', border: 'none', borderBottom: `3px solid ${tab === n.id ? 'var(--navy)' : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontWeight: tab === n.id ? 700 : 500,
            color: tab === n.id ? 'var(--navy)' : 'var(--muted)', fontSize: '0.88rem',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {n.emoji} {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px 24px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

        {/* Morning Brief */}
        {tab === 'brief' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)' }}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0] || 'Leader'} 🙏
              </h1>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '22px' }}>Constituency brief for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

            {!brief ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>⏳ Loading brief...</div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
                  {[
                    ['⚠️ SLA Violations', brief.sla_violations, '#C0392B', '#FDF3F3'],
                    ['✅ Resolved Yesterday', brief.resolved_yesterday, '#1A7340', '#E8F5EE'],
                    ['💬 Sentiment Score', `${Math.round((brief.sentiment_score || 0) * 100)}%`, '#003580', '#EBF0FA'],
                    ['🏆 Top Dept', brief.top_issues?.[0]?.department || '—', '#9E5A00', '#FFFBEB'],
                  ].map(([label, val, color, bg]) => (
                    <div key={label} style={{ background: 'var(--card)', border: `1px solid ${bg}`, borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '1.7rem', fontWeight: 900, color, marginBottom: '4px' }}>{val}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Alert */}
                {brief.heatmap_alert && (
                  <div style={{ background: '#FFF3EC', border: '1px solid var(--saffron-mid)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--saffron-dark)', fontSize: '0.9rem' }}>🔔 {brief.heatmap_alert}</div>
                  </div>
                )}

                {/* Top Issues */}
                <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>📊 Top Issues Today</div>
                  {(brief.top_issues || []).map((issue, i) => (
                    <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #F0F4FA', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontWeight: 900, color: 'var(--saffron)', fontSize: '1.1rem', width: '28px' }}>#{issue.rank}</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{issue.department}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{issue.count} complaints</span>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: issue.priority === 'critical' ? '#FDF3F3' : '#FFFBEB', color: issue.priority === 'critical' ? '#C0392B' : '#9E5A00', textTransform: 'capitalize' }}>{issue.priority}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Alerts */}
        {tab === 'alerts' && (
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>🚨 Real-Time Alerts</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Triggered when ward sentiment drops below threshold</p>
            {alerts.length === 0
              ? <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>No active alerts</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>All wards are within normal thresholds</div>
                </div>
              : alerts.map((a, i) => (
                <div key={i} style={{ background: '#FDF3F3', border: '1px solid #F5C6CB', borderRadius: '12px', padding: '16px 18px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#C0392B', marginBottom: '4px' }}>{a.ward} · {a.issue} ({a.severity?.toUpperCase()})</div>
                  <div style={{ fontSize: '0.85rem', color: '#4A5568' }}>{a.message}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* NayakAI */}
        {tab === 'nayakai' && (
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>🤖 NayakAI Co-pilot</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Summarize documents, draft speeches, write government letters using AI</p>

            <div style={{ background: 'var(--card)', borderRadius: '14px', padding: '22px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[['summarize', '📄', 'Summarize'], ['speech', '🎤', 'Speech'], ['letter', '✉️', 'Letter']].map(([m, emoji, l]) => (
                  <button key={m} onClick={() => setAiMode(m)} style={{
                    padding: '9px 16px', borderRadius: '8px', border: `2px solid ${aiMode === m ? 'var(--navy)' : 'var(--border)'}`,
                    cursor: 'pointer', background: aiMode === m ? 'var(--navy-light)' : 'var(--bg)',
                    color: aiMode === m ? 'var(--navy)' : 'var(--muted)', fontWeight: aiMode === m ? 700 : 500, fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    {emoji} {l}
                  </button>
                ))}
              </div>

              <textarea
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '9px', fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none', minHeight: '120px', resize: 'vertical' }}
                value={aiInput} onChange={e => setAiInput(e.target.value)}
                placeholder={aiMode === 'summarize' ? 'Paste document text here...' : aiMode === 'speech' ? 'Enter key points, one per line...' : 'Describe the issue and context...'}
                onFocus={e => e.target.style.borderColor = 'var(--navy)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />

              <button onClick={runAI} disabled={loading} style={{
                marginTop: '12px', padding: '11px 24px', background: loading ? '#ccc' : 'var(--navy)',
                border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
              }}>
                {loading ? '⏳ Generating...' : '✨ Generate with AI'}
              </button>

              {aiOut && (
                <div style={{ marginTop: '16px', background: 'var(--navy-light)', border: '1px solid #C5D5F0', borderRadius: '10px', padding: '18px', fontSize: '0.88rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {aiOut}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Heatmap placeholder */}
        {tab === 'heatmap' && (
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>🗺️ Constituency Heatmap</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Ward-level sentiment analysis</p>
            <div style={{ background: 'var(--card)', borderRadius: '14px', padding: '60px 24px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🗺️</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Interactive Map — Coming Soon</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Leaflet.js map with ward GeoJSON overlay. API at <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>/api/sentinel/heatmap</code> is live.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
