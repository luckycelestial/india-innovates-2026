import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const NAV = [
  { id: 'brief',   label: 'Morning Brief' },
  { id: 'alerts',  label: 'Alerts' },
  { id: 'nayakai', label: 'NayakAI' },
  { id: 'heatmap', label: 'Heatmap' },
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
  const [briefLoading, setBriefLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)

  useEffect(() => {
    if (tab === 'brief' && !brief) loadBrief()
    if (tab === 'alerts' && alerts.length === 0) loadAlerts()
  }, [tab])

  const loadBrief = async () => {
    setBriefLoading(true)
    try {
      const { data } = await api.post('/nayakai/morning-brief', {})
      setBrief(data)
    } catch (e) { console.error(e) }
    finally { setBriefLoading(false) }
  }

  const loadAlerts = async () => {
    setAlertsLoading(true)
    try {
      const { data } = await api.get('/sentinel/alerts')
      setAlerts(Array.isArray(data) ? data : (data.alerts || []))
    } catch (e) { console.error(e) }
    finally { setAlertsLoading(false) }
  }

  const runAI = async () => {
    if (!aiInput.trim()) return
    setLoading(true); setAiOut('')
    try {
      const { data } = await api.post('/nayakai/assist', { text: aiInput, mode: aiMode })
      setAiOut(data.result || data.output || '')
    } catch (e) { setAiOut('Error: ' + (e.response?.data?.detail || 'Request failed')) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />
      <div style={{ background: 'var(--navy)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>PRAJA</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '1px' }}>NayakAI Leader Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{user?.full_name || user?.name}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {/* Nav Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'var(--card)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)', width: 'fit-content' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: tab === n.id ? 'var(--navy)' : 'transparent',
              color: tab === n.id ? 'white' : 'var(--muted)',
              fontWeight: tab === n.id ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s'
            }}>{n.label}</button>
          ))}
        </div>

        {/* Morning Brief */}
        {tab === 'brief' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 900 }}>Morning Brief</h2>
              <button onClick={loadBrief} style={{ padding: '8px 18px', background: 'var(--saffron)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>Refresh</button>
            </div>
            {briefLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Generating brief...</div>
            ) : brief ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                  {[
                    ['SLA Violations', brief.sla_violations ?? '-', 'var(--danger)'],
                    ['Resolved Yesterday', brief.resolved_yesterday ?? '-', 'var(--green)'],
                    ['Sentiment', brief.sentiment_score != null ? (brief.sentiment_score * 100).toFixed(0) + '%' : '-', 'var(--navy)'],
                    ['Critical Open', brief.critical_open ?? '-', 'var(--saffron)'],
                  ].map(([lbl, val, color]) => (
                    <div key={lbl} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                {brief.top_issues && brief.top_issues.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>Top Issues</div>
                    {brief.top_issues.map((issue, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg)', marginBottom: '6px', fontSize: '0.84rem' }}>{issue}</div>
                    ))}
                  </div>
                )}
                {brief.summary && (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>Summary</div>
                    <p style={{ color: 'var(--light)', lineHeight: '1.6', fontSize: '0.85rem', margin: 0 }}>{brief.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Click Refresh to load today's brief.</div>
            )}
          </div>
        )}

        {/* Alerts */}
        {tab === 'alerts' && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '18px' }}>Constituency Alerts</h2>
            {alertsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>No active alerts. All quiet!</div>
            ) : alerts.map((a, i) => (
              <div key={i} style={{ background: a.severity === 'critical' ? '#FDF3F3' : 'var(--card)', border: `1px solid ${a.severity === 'critical' ? '#F5C6CB' : 'var(--border)'}`, borderRadius: '12px', padding: '16px 18px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.title || a.message}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: a.severity === 'critical' ? '#F5C6CB' : '#FFFBEB', color: a.severity === 'critical' ? 'var(--danger)' : '#9E5A00' }}>{a.severity || 'info'}</span>
                </div>
                {a.description && <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>{a.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* NayakAI */}
        {tab === 'nayakai' && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '6px' }}>NayakAI Assistant</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '18px' }}>Summarize documents, draft speeches, compose letters.</p>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {['summarize', 'speech', 'letter'].map(m => (
                  <button key={m} onClick={() => setAiMode(m)} style={{
                    padding: '7px 16px', borderRadius: '20px', border: `1.5px solid ${aiMode === m ? 'var(--navy)' : 'var(--border)'}`,
                    background: aiMode === m ? 'var(--navy-light)' : 'transparent',
                    color: aiMode === m ? 'var(--navy)' : 'var(--muted)',
                    fontWeight: aiMode === m ? 700 : 400, cursor: 'pointer', fontSize: '0.82rem', textTransform: 'capitalize'
                  }}>{m}</button>
                ))}
              </div>
              <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder={aiMode === 'summarize' ? 'Paste document or text to summarize...' : aiMode === 'speech' ? 'Describe the event and key points...' : 'Describe the purpose and recipient...'} rows={5} style={{ width: '100%', padding: '12px', border: '1.5px solid var(--border)', borderRadius: '8px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={runAI} disabled={loading || !aiInput.trim()} style={{ marginTop: '12px', padding: '10px 24px', background: loading ? 'var(--muted)' : 'var(--navy)', border: 'none', borderRadius: '8px', color: 'white', cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>{loading ? 'Processing...' : 'Generate'}</button>
              {aiOut && (
                <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.65', color: 'var(--text)' }}>{aiOut}</div>
              )}
            </div>
          </div>
        )}

        {/* Heatmap */}
        {tab === 'heatmap' && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '6px' }}>SentinelPulse Heatmap</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '18px' }}>Ward-level sentiment analysis from social media and grievances.</p>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px', color: 'var(--border)' }}>[ Map ]</div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Heatmap Coming Soon</div>
              <div style={{ fontSize: '0.85rem' }}>Real-time ward sentiment visualization will be available here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}