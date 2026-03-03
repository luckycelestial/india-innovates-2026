import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const S = {
  wrap:      { minHeight: '100vh', background: 'var(--navy)', display: 'flex' },
  sidebar:   { width: '200px', background: 'var(--dark)', borderRight: '1px solid var(--border)', padding: '24px 0', flexShrink: 0 },
  logo:      { padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: '16px' },
  logoText:  { fontSize: '1.1rem', fontWeight: 900, color: 'var(--saffron)' },
  navItem:   (active) => ({ display: 'block', padding: '9px 20px', fontSize: '0.82rem', cursor: 'pointer', background: active ? 'rgba(255,107,0,0.1)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--saffron)' : 'transparent'}`, color: active ? 'var(--white)' : 'var(--light)' }),
  main:      { flex: 1, padding: '28px', overflow: 'auto' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 900, marginBottom: '6px' },
  pageSub:   { color: 'var(--light)', fontSize: '0.85rem', marginBottom: '28px' },
  statsRow:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' },
  stat:      { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  statNum:   { fontSize: '2rem', fontWeight: 900, color: 'var(--saffron)' },
  statLabel: { fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  card:      { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '20px' },
  cardTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: '16px' },
  briefItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  briefRank: { color: 'var(--saffron)', fontWeight: 900, marginRight: '12px', fontSize: '1rem' },
  briefDept: { fontWeight: 600, flex: 1 },
  briefCount:{ color: 'var(--light)', fontSize: '0.82rem' },
  aiArea:    { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', color: 'var(--text)', fontSize: '0.88rem', minHeight: '90px', resize: 'vertical', outline: 'none' },
  aiBtn:     { marginTop: '12px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', borderRadius: '8px', padding: '10px 22px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' },
  aiOutput:  { marginTop: '14px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '10px', padding: '16px', fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.7' },
  logoutBtn: { display: 'block', margin: '20px', padding: '8px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'center' },
  alertBox:  { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' },
  alertHead: { fontWeight: 700, color: '#f87171', marginBottom: '4px', fontSize: '0.9rem' },
  alertMsg:  { fontSize: '0.82rem', color: 'var(--light)' },
}

const NAV = [
  { id: 'brief',   label: 'Morning Brief' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'alerts',  label: 'Alerts' },
  { id: 'nayakai', label: 'NayakAI' },
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
    <div style={S.wrap}>
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoText}>PRAJA</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '1px' }}>LEADER PORTAL</div>
        </div>
        {NAV.map(n => <div key={n.id} style={S.navItem(tab === n.id)} onClick={() => setTab(n.id)}>{n.label}</div>)}
        <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
      <div style={S.main}>
        {tab === 'brief' && brief && (
          <>
            <div style={S.pageTitle}>Good Morning, {user?.name?.split(' ')[0]}</div>
            <div style={S.pageSub}>Constituency brief for today.</div>
            <div style={S.statsRow}>
              {[
                ['SLA Violations', brief.sla_violations, '#f87171'],
                ['Resolved Yesterday', brief.resolved_yesterday, '#86efac'],
                ['Sentiment Score', `${Math.round(brief.sentiment_score * 100)}%`, 'var(--gold)'],
                ['Top Dept', brief.top_issues[0]?.department, 'var(--saffron)'],
              ].map(([label, val, color]) => (
                <div key={label} style={S.stat}>
                  <div style={{ ...S.statNum, color, fontSize: typeof val === 'string' && val.length > 5 ? '1.2rem' : '2rem' }}>{val}</div>
                  <div style={S.statLabel}>{label}</div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Alert: {brief.heatmap_alert}</div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Top Issues Today</div>
              {brief.top_issues.map(issue => (
                <div key={issue.rank} style={S.briefItem}>
                  <span style={S.briefRank}>#{issue.rank}</span>
                  <span style={S.briefDept}>{issue.department}</span>
                  <span style={S.briefCount}>{issue.count} complaints &middot; <strong style={{ color: issue.priority === 'critical' ? '#f87171' : 'var(--gold)' }}>{issue.priority}</strong></span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'heatmap' && (
          <>
            <div style={S.pageTitle}>Constituency Heatmap</div>
            <div style={S.pageSub}>Ward-level sentiment analysis.</div>
            <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>Map</div>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>Interactive Map - Week 3 Feature</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Leaflet.js map with ward GeoJSON coming in Week 3. API at /api/sentinel/heatmap is live.</div>
            </div>
          </>
        )}
        {tab === 'alerts' && (
          <>
            <div style={S.pageTitle}>Real-Time Alerts</div>
            <div style={S.pageSub}>Triggered when ward sentiment drops below threshold.</div>
            {alerts.length === 0
              ? <div style={{ color: 'var(--muted)' }}>No active alerts.</div>
              : alerts.map((a, i) => (
                <div key={i} style={S.alertBox}>
                  <div style={S.alertHead}>{a.ward} - {a.issue} ({a.severity?.toUpperCase()})</div>
                  <div style={S.alertMsg}>{a.message}</div>
                </div>
              ))
            }
          </>
        )}
        {tab === 'nayakai' && (
          <>
            <div style={S.pageTitle}>NayakAI Co-pilot</div>
            <div style={S.pageSub}>Summarize documents, draft speeches, write government letters</div>
            <div style={S.card}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                {[['summarize', 'Summarize'], ['speech', 'Speech'], ['letter', 'Letter']].map(([m, l]) => (
                  <button key={m} onClick={() => setAiMode(m)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: aiMode === m ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)', color: aiMode === m ? '#c084fc' : 'var(--light)', fontWeight: aiMode === m ? 700 : 400, fontSize: '0.83rem' }}>
                    {l}
                  </button>
                ))}
              </div>
              <textarea style={S.aiArea} value={aiInput} onChange={e => setAiInput(e.target.value)}
                placeholder={aiMode === 'summarize' ? 'Paste document text here...' : aiMode === 'speech' ? 'Enter key points, one per line...' : 'Describe the issue and context...'} />
              <button style={S.aiBtn} onClick={runAI} disabled={loading}>
                {loading ? 'Generating...' : 'Generate with AI'}
              </button>
              {aiOut && <div style={S.aiOutput}>{aiOut}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
