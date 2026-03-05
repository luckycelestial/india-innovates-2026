import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './UnifiedDashboard.css'

// ─── helpers ────────────────────────────────────────────
const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', escalated: 'Escalated', closed: 'Closed',
}

// Safely convert any value to a displayable string
function safe(val) {
  if (val == null) return '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// ─── Toast ──────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`ud-toast ${type}`}>
      <span style={{ flex: 1 }}>{safe(message)}</span>
      <button className="ud-toast-close" onClick={onClose}>×</button>
    </div>
  )
}

// ─── Submit Complaint ────────────────────────────────────
function SubmitTab({ onToast }) {
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(null)
  const [error, setError]           = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true); setSubmitted(null)
    try {
      const { data } = await api.post('/grievances/submit', { title, description })
      setSubmitted(data)
      setTitle(''); setDesc('')
      onToast(`✅ Submitted — ID: ${safe(data.tracking_id)}`, 'success')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => safe(d.msg ?? d)).join('; ')
        : safe(detail) || 'Submission failed'
      setError(msg)
      onToast(`❌ ${msg}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <p className="ud-title">File a Complaint</p>
      <p className="ud-subtitle">AI auto-classifies department and priority. Supports Tamil, Hindi, Telugu, English.</p>

      {submitted && (
        <div className="ud-alert-success">
          <strong>✅ Complaint submitted</strong>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            ID: <span className="ud-tracking-id">{safe(submitted.tracking_id)}</span>
            {submitted.ai_category && (
              <span style={{ marginLeft: 10, color: '#94a3b8' }}>
                📂 {safe(submitted.ai_category)}
                {submitted.priority && (
                  <span className={`ud-pri-${submitted.priority}`} style={{ marginLeft: 6 }}>
                    {safe(submitted.priority).toUpperCase()}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {error && <div className="ud-alert-error">{error}</div>}

      <div className="ud-card-form">
        <form onSubmit={handleSubmit}>
          <div className="ud-field">
            <label className="ud-label">Title</label>
            <input
              className="ud-input"
              placeholder="e.g. No water supply in our area"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="ud-field" style={{ marginBottom: 22 }}>
            <label className="ud-label">Description</label>
            <textarea
              className="ud-textarea"
              placeholder="Describe your issue in any language"
              value={description}
              onChange={e => setDesc(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="ud-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : '📤 Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── My Complaints ───────────────────────────────────────
function MyComplaintsTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/grievances/')
      .then(r => {
        const data = r.data
        setTickets(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="ud-loading">Loading...</p>

  return (
    <div>
      <p className="ud-title">My Complaints</p>
      <p className="ud-subtitle">{tickets.length} complaint{tickets.length !== 1 ? 's' : ''} filed</p>

      {tickets.length === 0
        ? <div className="ud-alert-empty">No complaints yet. Use &quot;Submit&quot; tab to file one.</div>
        : tickets.map(t => (
          <div key={t.id} className="ud-card">
            <div className="ud-ticket-header">
              <span className="ud-ticket-title">{safe(t.title)}</span>
              <span className={`ud-badge ud-badge-${t.status || 'open'}`}>
                {STATUS_LABEL[t.status] || safe(t.status)}
              </span>
            </div>
            <div className="ud-ticket-meta">
              <span className="ud-tracking-id">{safe(t.tracking_id)}</span>
              {t.ai_category && <span>{safe(t.ai_category)}</span>}
              {t.priority && (
                <span className={`ud-pri-${t.priority}`}>{safe(t.priority).toUpperCase()}</span>
              )}
            </div>
            {t.description && (
              <div className="ud-ticket-desc">
                {String(t.description).slice(0, 120)}
                {String(t.description).length > 120 ? '…' : ''}
              </div>
            )}
          </div>
        ))
      }
    </div>
  )
}

// ─── Manage Tickets ──────────────────────────────────────
function ManageTicketsTab() {
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setFilter] = useState('')
  const [updating, setUpdating]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = { limit: 100 }
    if (statusFilter) params.status = statusFilter
    api.get('/officers/tickets', { params })
      .then(r => {
        const data = r.data
        setTickets(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.put(`/grievances/${id}/status`, { status })
      load()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => safe(d.msg ?? d)).join('; ')
        : safe(detail) || 'Error updating status'
      alert(msg)
    } finally {
      setUpdating(null)
    }
  }

  const counts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const STAT_ITEMS = [
    { key: 'open',        label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved',    label: 'Resolved' },
    { key: 'escalated',   label: 'Escalated' },
  ]

  return (
    <div>
      <p className="ud-title">Manage Tickets</p>

      <div className="ud-stats-row">
        {STAT_ITEMS.map(({ key, label }) => (
          <div
            key={key}
            className={`ud-stat-card ${statusFilter === key ? `active-${key}` : ''}`}
            onClick={() => setFilter(f => f === key ? '' : key)}
          >
            <div className={`ud-stat-num ${key}`}>{counts[key] || 0}</div>
            <div className="ud-stat-label">{label}</div>
          </div>
        ))}
        <div className="ud-stat-card">
          <div className="ud-stat-num total">{tickets.length}</div>
          <div className="ud-stat-label">total</div>
        </div>
      </div>

      {loading
        ? <p className="ud-loading">Loading...</p>
        : tickets.length === 0
          ? <div className="ud-alert-empty">No tickets found</div>
          : tickets.map(t => (
            <div key={t.id} className="ud-card">
              <div className="ud-ticket-header">
                <div style={{ flex: 1 }}>
                  <div className="ud-ticket-title">{safe(t.title)}</div>
                  <div className="ud-ticket-meta" style={{ marginTop: 4 }}>
                    <span className="ud-tracking-id">{safe(t.tracking_id)}</span>
                    {t.ai_category && <span>{safe(t.ai_category)}</span>}
                    {t.priority && (
                      <span className={`ud-pri-${t.priority}`}>{safe(t.priority).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <select
                  className="ud-status-select"
                  value={t.status || 'open'}
                  onChange={e => updateStatus(t.id, e.target.value)}
                  disabled={updating === t.id}
                >
                  {['open','assigned','in_progress','resolved','escalated'].map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                  ))}
                </select>
              </div>
              {t.description && (
                <div className="ud-ticket-desc">
                  {String(t.description).slice(0, 100)}
                  {String(t.description).length > 100 ? '…' : ''}
                </div>
              )}
            </div>
          ))
      }
    </div>
  )
}

// ─── NayakAI ─────────────────────────────────────────────
function NayakAITab() {
  const [activeTab, setActiveTab] = useState('brief')
  const [brief, setBrief]         = useState(null)
  const [briefLoading, setBL]     = useState(false)
  const [prompt, setPrompt]       = useState('')
  const [speechTopic, setST]      = useState('')
  const [speechLang, setSL]       = useState('English')
  const [loading, setLoading]     = useState(false)
  const [aiOutput, setAiOutput]   = useState('')
  const [chatHistory, setChat]    = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoad]= useState(false)

  const loadBrief = useCallback(async () => {
    setBL(true)
    try {
      const { data } = await api.post('/nayakai/morning-brief', {})
      setBrief(data)
    } catch (e) {
      console.error('morning-brief error', e)
    } finally {
      setBL(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'brief' && !brief) loadBrief()
  }, [activeTab, brief, loadBrief])

  const callAI = async (text, mode) => {
    setLoading(true); setAiOutput('')
    try {
      const { data } = await api.post('/nayakai/assist', { text, mode })
      setAiOutput(safe(data.result) || 'No response')
    } catch {
      setAiOutput('⚠️ Connection error — check backend status')
    } finally {
      setLoading(false)
    }
  }

  const sendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    setChat(h => [...h, { role: 'user', text: msg }])
    setChatLoad(true)
    try {
      const { data } = await api.post('/nayakai/ask', { question: msg, constituency: 'Delhi North' })
      setChat(h => [...h, { role: 'ai', text: safe(data.answer) }])
    } catch {
      setChat(h => [...h, { role: 'ai', text: '⚠️ Error. Try again.' }])
    } finally {
      setChatLoad(false)
    }
  }

  const NK_TABS = [
    { id: 'brief',  label: '☀️ Brief' },
    { id: 'chat',   label: '💬 Chat' },
    { id: 'doc',    label: '📄 Summarize' },
    { id: 'speech', label: '✍️ Speech' },
  ]

  return (
    <div>
      <p className="ud-title">🤖 NayakAI — Leader Intelligence</p>

      <div className="nk-tabs">
        {NK_TABS.map(t => (
          <button
            key={t.id}
            className={`nk-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); setAiOutput('') }}
          >{t.label}</button>
        ))}
      </div>

      {activeTab === 'brief' && (
        briefLoading
          ? <p className="ud-loading">Generating brief...</p>
          : brief
            ? (
              <div>
                <div className="nk-brief-box">
                  <div className="nk-brief-header">Morning Brief — {safe(brief.date)}</div>
                  <div className="nk-brief-stats">
                    {[
                      ['Open',         brief.total_open,     'orange'],
                      ['Critical',     brief.critical_open,  'red'],
                      ['SLA Breaches', brief.sla_violations, 'gold'],
                    ].map(([label, val, cls]) => (
                      <div key={label} className={`nk-brief-stat ${cls}`}>
                        <div className={`nk-brief-stat-num ${cls}`}>{safe(val)}</div>
                        <div className="nk-brief-stat-label">{label}</div>
                      </div>
                    ))}
                  </div>
                  {brief.summary && <div className="nk-summary-box">{safe(brief.summary)}</div>}
                </div>
                <button className="ud-btn-secondary" onClick={loadBrief}>↻ Refresh</button>
              </div>
            )
            : <button className="ud-btn-primary" onClick={loadBrief}>☀️ Generate Morning Brief</button>
      )}

      {activeTab === 'chat' && (
        <div className="nk-chat-wrap">
          <div className="nk-chat-messages">
            {chatHistory.length === 0 && (
              <p className="nk-chat-empty">Ask anything — grievances, schemes, ward stats, governance</p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`nk-msg ${msg.role}`}>
                {msg.role === 'ai' && <div className="nk-msg-sender">🤖 NAYAKAI</div>}
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="nk-msg thinking">🤖 Thinking...</div>}
          </div>
          <form className="nk-chat-form" onSubmit={sendChat}>
            <input
              className="nk-chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask NayakAI anything..."
            />
            <button type="submit" className="ud-btn-send" disabled={chatLoading || !chatInput.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      {activeTab === 'doc' && (
        <div>
          <p className="nk-ai-hint">Paste any government document or scheme description:</p>
          <textarea
            className="ud-textarea"
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. PM Awas Yojana guidelines..."
          />
          <button
            className="ud-btn-primary"
            style={{ marginTop: 10 }}
            disabled={loading || !prompt.trim()}
            onClick={() => callAI(prompt, 'summarize')}
          >{loading ? '⏳ Summarizing...' : '🧠 Summarize'}</button>
          {aiOutput && <div className="nk-output green">{aiOutput}</div>}
        </div>
      )}

      {activeTab === 'speech' && (
        <div>
          <div className="nk-row">
            <input
              className="ud-input"
              style={{ flex: 1 }}
              value={speechTopic}
              onChange={e => setST(e.target.value)}
              placeholder="Event: e.g. Inauguration of Community Park"
            />
            <select className="nk-select" value={speechLang} onChange={e => setSL(e.target.value)}>
              {['English','Hindi','Tamil','Telugu','Bengali','Marathi'].map(l => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <button
            className="ud-btn-primary"
            disabled={loading || !speechTopic.trim()}
            onClick={() => callAI(
              `Event: ${speechTopic}. Language: ${speechLang}. Constituency: Delhi North.`,
              'speech'
            )}
          >{loading ? '⏳ Drafting...' : '✍️ Draft Speech'}</button>
          {aiOutput && <div className="nk-output gold">{aiOutput}</div>}
        </div>
      )}
    </div>
  )
}

// ─── SentinelPulse ───────────────────────────────────────
const WARDS = [
  { id: 1,  name: 'Connaught Place', score: 72, issues: ['Road maintenance','Parking'],           trend: '+5%'  },
  { id: 3,  name: 'Karol Bagh',      score: 38, issues: ['Garbage','Water shortage'],             trend: '-12%' },
  { id: 7,  name: 'Rohini',          score: 21, issues: ['Water supply','Power cuts','Drainage'], trend: '-23%' },
  { id: 11, name: 'Dwarka',          score: 61, issues: ['Traffic lights','Parks'],               trend: '+8%'  },
  { id: 14, name: 'Saket',           score: 45, issues: ['Street lights','Potholes'],             trend: '-6%'  },
  { id: 19, name: 'Okhla',           score: 18, issues: ['Sewage','Flooding','Healthcare'],       trend: '-31%' },
  { id: 22, name: 'Lajpat Nagar',    score: 54, issues: ['Road conditions','Noise'],              trend: '-4%'  },
  { id: 28, name: 'Janakpuri',       score: 83, issues: ['Minor road issues'],                    trend: '+11%' },
]

function wardColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 45) return '#f59e0b'
  if (score >= 25) return '#FF6B00'
  return '#ef4444'
}

function SentinelTab() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <p className="ud-title">🗺️ SentinelPulse — Ward Sentiment</p>
      <p className="ud-subtitle">Real-time mood index per ward. Click any ward for details.</p>

      <div className="sp-legend">
        {[
          ['Satisfied 70+',  '#22c55e'],
          ['Moderate 45–70', '#f59e0b'],
          ['Tense 25–45',    '#FF6B00'],
          ['Crisis <25',     '#ef4444'],
        ].map(([label, color]) => (
          <div key={color} className="sp-legend-item">
            <div className="sp-legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      <div className="sp-grid">
        {WARDS.map(w => {
          const c = wardColor(w.score)
          const isSel = selected?.id === w.id
          return (
            <div
              key={w.id}
              className={`sp-ward ${isSel ? 'selected' : ''}`}
              style={{ background: `${c}15`, borderColor: isSel ? c : `${c}44` }}
              onClick={() => setSelected(isSel ? null : w)}
            >
              <div className="sp-ward-id">Ward {w.id}</div>
              <div className="sp-ward-score" style={{ color: c }}>{w.score}</div>
              <div className="sp-ward-trend" style={{ color: c }}>{w.trend}</div>
              <div className="sp-ward-name">{w.name}</div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="sp-detail ud-card" style={{ borderColor: `${wardColor(selected.score)}55` }}>
          <div className="sp-detail-title" style={{ color: wardColor(selected.score) }}>
            Ward {selected.id} — {selected.name}
          </div>
          <div className="sp-detail-meta">
            Score: <strong style={{ color: wardColor(selected.score) }}>{selected.score}/100</strong>
            {' · Trend: '}<strong>{selected.trend}</strong>
          </div>
          <div className="sp-issues-label">Top Issues</div>
          {selected.issues.map((issue, i) => (
            <div key={i} className="sp-issue">{issue}</div>
          ))}
        </div>
      )}

      <div className="sp-alerts-label" style={{ marginTop: 20 }}>Critical Alerts</div>
      {WARDS.filter(w => w.score < 25).map(w => (
        <div key={w.id} className="sp-alert">
          <div>
            <div className="sp-alert-name">🚨 Ward {w.id} — {w.name}</div>
            <div className="sp-alert-sub">Score: {w.score} · {w.issues.join(', ')}</div>
          </div>
          <span className="sp-alert-trend">{w.trend}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────
export default function UnifiedDashboard() {
  const { user, logout } = useAuth()
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const role = user?.role || 'citizen'

  const TABS = [
    { id: 'submit',   label: '📝 Submit',         roles: ['citizen','officer','leader'] },
    { id: 'mine',     label: '📋 My Complaints',  roles: ['citizen','officer','leader'] },
    { id: 'manage',   label: '🗂️ Manage Tickets', roles: ['officer','leader'] },
    { id: 'nayak',    label: '🤖 NayakAI',         roles: ['leader'] },
    { id: 'sentinel', label: '🗺️ Sentinel',         roles: ['leader'] },
  ].filter(t => t.roles.includes(role))

  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit')

  const roleLabel = { citizen: 'Citizen', officer: 'Officer', leader: 'Leader' }[role] || safe(role)

  return (
    <div className="ud-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <header className="ud-topbar">
        <div className="ud-logo">
          <div className="ud-logo-icon">P</div>
          <div>
            <div className="ud-logo-name">PRAJA</div>
            <div className="ud-logo-sub">Citizen Grievance Platform</div>
          </div>
        </div>
        <div className="ud-user-info">
          <div>
            <div className="ud-user-name">Hello, {safe(user?.name)}</div>
            <div className={`ud-user-role ${role}`}>{roleLabel}</div>
          </div>
          <button className="ud-signout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <nav className="ud-tabnav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ud-tab ${activeTab === t.id ? `active ${role}` : ''}`}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </nav>

      <main className="ud-content">
        {activeTab === 'submit'   && <SubmitTab onToast={(msg, type) => setToast({ message: msg, type })} />}
        {activeTab === 'mine'     && <MyComplaintsTab />}
        {activeTab === 'manage'   && <ManageTicketsTab />}
        {activeTab === 'nayak'    && <NayakAITab />}
        {activeTab === 'sentinel' && <SentinelTab />}
      </main>
    </div>
  )
}
