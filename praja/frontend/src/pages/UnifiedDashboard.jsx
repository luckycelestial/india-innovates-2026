import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import SentinelHeatmap from '../components/SentinelHeatmap'
import AnalyticsTab from '../components/AnalyticsTab'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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
  const [photoUrl, setPhotoUrl]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(null)
  const [error, setError]           = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true); setSubmitted(null)
    try {
      const body = { title, description }
      if (photoUrl.trim()) body.photo_url = photoUrl.trim()
      const { data } = await api.post('/grievances/submit', body)
      setSubmitted(data)
      setTitle(''); setDesc(''); setPhotoUrl('')
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
          <div className="ud-field" style={{ marginBottom: 22 }}>
            <label className="ud-label">📷 Photo Evidence (optional)</label>
            <input
              className="ud-input"
              placeholder="Paste image URL (e.g. https://imgur.com/...)"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
            />
            {photoUrl && (
              <img src={photoUrl} alt="Preview" className="ud-photo-preview" onError={e => {e.target.style.display='none'}} />
            )}
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
  const [schemes, setSchemes] = useState([])
  const [showSchemes, setShowSchemes] = useState(false)

  useEffect(() => {
    api.get('/grievances/')
      .then(r => {
        const data = r.data
        setTickets(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadSchemes = async () => {
    setShowSchemes(!showSchemes)
    if (schemes.length === 0) {
      try {
        const { data } = await api.get('/grievances/schemes')
        setSchemes(Array.isArray(data) ? data : [])
      } catch { setSchemes([]) }
    }
  }

  const getSlaStatus = (sla_deadline) => {
    if (!sla_deadline) return null
    const now = new Date()
    const sla = new Date(sla_deadline)
    const hoursLeft = (sla - now) / 3600000
    if (hoursLeft < 0) return { text: `Breached ${Math.abs(Math.round(hoursLeft))}h ago`, cls: 'sla-breach' }
    if (hoursLeft < 24) return { text: `${Math.round(hoursLeft)}h left`, cls: 'sla-warning' }
    return { text: `${Math.round(hoursLeft / 24)}d left`, cls: 'sla-ok' }
  }

  if (loading) return <p className="ud-loading">Loading...</p>

  return (
    <div>
      <p className="ud-title">My Complaints</p>
      <p className="ud-subtitle">{tickets.length} complaint{tickets.length !== 1 ? 's' : ''} filed</p>

      <button className="ud-btn-secondary" style={{ marginBottom: 16 }} onClick={loadSchemes}>
        {showSchemes ? '📋 Hide Schemes' : '🏛️ View Eligible Government Schemes'}
      </button>

      {showSchemes && schemes.length > 0 && (
        <div className="ud-schemes-section">
          <p className="ud-subtitle" style={{marginTop:0}}>Government Schemes {schemes.filter(s=>s.is_matched).length > 0 && <span className="ud-badge ud-badge-matched">✓ Matched to your complaints</span>}</p>
          <div className="ud-schemes-grid">
            {schemes.map(s => (
              <div key={s.id} className={`ud-scheme-card ${s.is_matched ? 'matched' : ''}`}>
                <div className="ud-scheme-name">{s.name} {s.is_matched && <span className="ud-matched-tag">Recommended</span>}</div>
                <div className="ud-scheme-dept">{s.department}</div>
                <div className="ud-scheme-desc">{s.description}</div>
                {s.benefits && <div className="ud-scheme-benefits">💰 {s.benefits}</div>}
                {s.eligibility_criteria && <div className="ud-scheme-eligibility">📋 {s.eligibility_criteria}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0
        ? <div className="ud-alert-empty">No complaints yet. Use &quot;Submit&quot; tab to file one.</div>
        : tickets.map(t => {
          const sla = getSlaStatus(t.sla_deadline)
          return (
            <div key={t.id} className="ud-card">
              <div className="ud-ticket-header">
                <span className="ud-ticket-title">{safe(t.title)}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {sla && t.status !== 'resolved' && (
                    <span className={`ud-sla-badge ${sla.cls}`}>⏱ {sla.text}</span>
                  )}
                  <span className={`ud-badge ud-badge-${t.status || 'open'}`}>
                    {STATUS_LABEL[t.status] || safe(t.status)}
                  </span>
                </div>
              </div>
              <div className="ud-ticket-meta">
                <span className="ud-tracking-id">{safe(t.tracking_id)}</span>
                {t.ai_category && <span>{safe(t.ai_category)}</span>}
                {t.priority && (
                  <span className={`ud-pri-${t.priority}`}>{safe(t.priority).toUpperCase()}</span>
                )}
                {t.escalation_level > 0 && (
                  <span className="ud-escalation-badge">🔺 Level {t.escalation_level}</span>
                )}
              </div>
              {t.photo_url && <img src={t.photo_url} alt="Evidence" className="ud-ticket-photo" />}
              {t.description && (
                <div className="ud-ticket-desc">
                  {String(t.description).slice(0, 120)}
                  {String(t.description).length > 120 ? '…' : ''}
                </div>
              )}
              {t.status === 'resolved' && t.resolution_note && (
                <div className="ud-resolution-note">✅ Resolution: {t.resolution_note}</div>
              )}
              {t.after_photo_url && (
                <div className="ud-before-after">
                  {t.before_photo_url && <div><span className="ud-photo-label">Before</span><img src={t.before_photo_url} alt="Before" /></div>}
                  <div><span className="ud-photo-label">After</span><img src={t.after_photo_url} alt="After" /></div>
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

// ─── Manage Tickets ──────────────────────────────────────
function ManageTicketsTab({ onToast }) {
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setFilter] = useState('')
  const [updating, setUpdating]   = useState(null)
  const [perf, setPerf]           = useState(null)
  const [showPerf, setShowPerf]   = useState(false)
  const [escalating, setEscalating] = useState(false)

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
      await api.put(`/grievances/${id}/status`, null, { params: { status } })
      load()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => safe(d.msg ?? d)).join('; ')
        : safe(detail) || 'Error updating status'
      console.error('Status update failed:', msg)
    } finally {
      setUpdating(null)
    }
  }

  const runAutoEscalation = async () => {
    setEscalating(true)
    try {
      const { data } = await api.post('/grievances/check-escalation')
      if (onToast) onToast(`🔺 Auto-escalated ${data.escalated_count} ticket(s)`, data.escalated_count > 0 ? 'warning' : 'success')
      load()
    } catch {
      if (onToast) onToast('❌ Escalation check failed', 'error')
    } finally {
      setEscalating(false)
    }
  }

  const loadPerformance = async () => {
    setShowPerf(!showPerf)
    if (!perf) {
      try {
        const { data } = await api.get('/officers/performance')
        setPerf(data)
      } catch { setPerf(null) }
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

  const CHART_COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16']

  return (
    <div>
      <p className="ud-title">Manage Tickets</p>

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <button className="ud-btn-secondary" onClick={runAutoEscalation} disabled={escalating}>
          {escalating ? '⏳ Checking...' : '🔺 Run Auto-Escalation'}
        </button>
        <button className="ud-btn-secondary" onClick={loadPerformance}>
          {showPerf ? '📊 Hide Stats' : '📊 Department Performance'}
        </button>
      </div>

      {showPerf && perf && (
        <div className="ud-perf-section">
          <div className="ud-stats-row">
            <div className="ud-stat-card"><div className="ud-stat-num total">{perf.total_grievances}</div><div className="ud-stat-label">Total</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num open">{perf.total_open}</div><div className="ud-stat-label">Open</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num resolved">{perf.total_resolved}</div><div className="ud-stat-label">Resolved</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num escalated">{perf.total_escalated}</div><div className="ud-stat-label">Escalated</div></div>
          </div>
          <div className="ud-stats-row" style={{marginTop:10}}>
            <div className="ud-stat-card"><div className="ud-stat-num" style={{color: perf.sla_compliance_pct >= 80 ? '#10b981' : '#ef4444'}}>{perf.sla_compliance_pct}%</div><div className="ud-stat-label">SLA Compliance</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num" style={{color:'#f59e0b'}}>{perf.avg_resolution_hours}h</div><div className="ud-stat-label">Avg Resolution</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num" style={{color:'#ef4444'}}>{perf.sla_breached}</div><div className="ud-stat-label">SLA Breached</div></div>
          </div>
          {perf.category_breakdown?.length > 0 && (
            <div className="ud-chart-container">
              <p className="ud-chart-title">Category Breakdown</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perf.category_breakdown} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{fill:'#475569',fontSize:11}} />
                  <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,color:'#1e293b'}} />
                  <Bar dataKey="total" name="Total" radius={[4,4,0,0]}>
                    {perf.category_breakdown.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

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
                    {t.escalation_level > 0 && (
                      <span className="ud-escalation-badge">🔺 L{t.escalation_level}</span>
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
              {t.photo_url && <img src={t.photo_url} alt="Evidence" className="ud-ticket-photo" />}
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
  // Schedule state
  const [schedules, setSchedules] = useState([])
  const [schedForm, setSchedForm] = useState({ title:'', description:'', event_date:'', event_time:'', location:'', event_type:'meeting' })
  const [schedLoading, setSchedLoading] = useState(false)
  // Action alerts
  const [actionAlerts, setActionAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  // Meeting summary
  const [meetingNotes, setMeetingNotes] = useState('')
  const [meetingType, setMeetingType] = useState('general')
  const [meetingSummary, setMeetingSummary] = useState('')
  // Report card
  const [reportCard, setReportCard] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('month')

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

  // Schedule handlers
  const loadSchedules = useCallback(async () => {
    try {
      const { data } = await api.get('/nayakai/schedule')
      setSchedules(Array.isArray(data) ? data : [])
    } catch { setSchedules([]) }
  }, [])

  useEffect(() => {
    if (activeTab === 'schedule') loadSchedules()
  }, [activeTab, loadSchedules])

  const createSchedule = async (e) => {
    e.preventDefault()
    setSchedLoading(true)
    try {
      await api.post('/nayakai/schedule', schedForm)
      setSchedForm({ title:'', description:'', event_date:'', event_time:'', location:'', event_type:'meeting' })
      loadSchedules()
    } catch {} finally { setSchedLoading(false) }
  }

  // Action alerts handler
  const loadActionAlerts = async () => {
    setAlertsLoading(true)
    try {
      const { data } = await api.post('/nayakai/action-alerts')
      setActionAlerts(Array.isArray(data) ? data : [])
    } catch { setActionAlerts([]) } finally { setAlertsLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'alerts' && actionAlerts.length === 0) loadActionAlerts()
  }, [activeTab])

  // Meeting summary handler
  const summarizeMeeting = async () => {
    setLoading(true); setMeetingSummary('')
    try {
      const { data } = await api.post('/nayakai/meeting-summary', { notes: meetingNotes, meeting_type: meetingType })
      setMeetingSummary(data.summary || 'No summary generated')
    } catch { setMeetingSummary('⚠️ Error generating summary') } finally { setLoading(false) }
  }

  // Report card handler
  const generateReport = async () => {
    setReportLoading(true); setReportCard(null)
    try {
      const { data } = await api.post('/nayakai/report-card', { period: reportPeriod })
      setReportCard(data)
    } catch { setReportCard(null) } finally { setReportLoading(false) }
  }

  const NK_TABS = [
    { id: 'brief',    label: '☀️ Brief' },
    { id: 'chat',     label: '💬 Chat' },
    { id: 'doc',      label: '📄 Summarize' },
    { id: 'speech',   label: '✍️ Speech' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'alerts',   label: '🚨 Alerts' },
    { id: 'meeting',  label: '📝 Meeting' },
    { id: 'report',   label: '📊 Report' },
  ]

  return (
    <div>
      <p className="ud-title">🤖 NayakAI — Governance Intelligence</p>

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
          <p className="nk-ai-hint">Paste text or upload a document (.txt, .pdf, .doc):</p>
          <textarea
            className="ud-textarea"
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. PM Awas Yojana guidelines..."
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <label className="ud-btn-small" style={{ cursor: 'pointer' }}>
              📎 Upload File
              <input type="file" accept=".txt,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 2 * 1024 * 1024) { alert('File too large (max 2 MB)'); return }
                const reader = new FileReader()
                reader.onload = () => setPrompt(reader.result)
                reader.readAsText(file)
                e.target.value = ''
              }} />
            </label>
            <button
              className="ud-btn-primary"
              disabled={loading || !prompt.trim()}
              onClick={() => callAI(prompt, 'summarize')}
            >{loading ? '⏳ Summarizing...' : '🧠 Summarize'}</button>
          </div>
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

      {activeTab === 'schedule' && (
        <div>
          <p className="nk-ai-hint">Manage your constituency calendar. AI generates preparation briefs for each event.</p>
          <form className="ud-card-form" onSubmit={createSchedule}>
            <div className="nk-sched-grid">
              <div className="ud-field">
                <label className="ud-label">Event Title</label>
                <input className="ud-input" value={schedForm.title} onChange={e => setSchedForm({...schedForm, title:e.target.value})} required placeholder="e.g. Ward Meeting" />
              </div>
              <div className="ud-field">
                <label className="ud-label">Date</label>
                <input className="ud-input" type="date" value={schedForm.event_date} onChange={e => setSchedForm({...schedForm, event_date:e.target.value})} required />
              </div>
              <div className="ud-field">
                <label className="ud-label">Time</label>
                <input className="ud-input" type="time" value={schedForm.event_time} onChange={e => setSchedForm({...schedForm, event_time:e.target.value})} />
              </div>
              <div className="ud-field">
                <label className="ud-label">Location</label>
                <input className="ud-input" value={schedForm.location} onChange={e => setSchedForm({...schedForm, location:e.target.value})} placeholder="e.g. Community Hall" />
              </div>
              <div className="ud-field">
                <label className="ud-label">Type</label>
                <select className="nk-select" value={schedForm.event_type} onChange={e => setSchedForm({...schedForm, event_type:e.target.value})}>
                  {['meeting','inauguration','review','hearing','visit','rally'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="ud-field">
              <label className="ud-label">Description / Notes</label>
              <textarea className="ud-textarea" rows={2} value={schedForm.description} onChange={e => setSchedForm({...schedForm, description:e.target.value})} placeholder="Brief context (optional)" />
            </div>
            <button type="submit" className="ud-btn-primary" disabled={schedLoading}>
              {schedLoading ? '⏳ Creating...' : '📅 Add Event (AI Brief Auto-Generated)'}
            </button>
          </form>
          {schedules.length > 0 && (
            <div style={{marginTop:20}}>
              <p className="ud-subtitle">Upcoming Events</p>
              {schedules.map(s => (
                <div key={s.id} className="ud-card">
                  <div className="ud-ticket-header">
                    <div>
                      <div className="ud-ticket-title">📅 {s.title}</div>
                      <div className="ud-ticket-meta" style={{marginTop:4}}>
                        <span>{s.event_date}</span>
                        {s.event_time && <span>⏰ {s.event_time}</span>}
                        {s.location && <span>📍 {s.location}</span>}
                        <span className="ud-badge ud-badge-open">{s.event_type}</span>
                      </div>
                    </div>
                  </div>
                  {s.ai_brief && <div className="nk-output green" style={{marginTop:8,whiteSpace:'pre-wrap'}}>{s.ai_brief}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div>
          <p className="nk-ai-hint">AI-drafted responses for escalated and critical grievances requiring immediate action.</p>
          <button className="ud-btn-secondary" onClick={loadActionAlerts} disabled={alertsLoading} style={{marginBottom:16}}>
            {alertsLoading ? '⏳ Loading...' : '↻ Refresh Alerts'}
          </button>
          {actionAlerts.length === 0 && !alertsLoading && <div className="ud-alert-empty">No critical alerts right now. All under control.</div>}
          {actionAlerts.map(a => (
            <div key={a.id} className="ud-card" style={{borderLeft: a.priority === 'critical' ? '3px solid #ef4444' : '3px solid #f59e0b'}}>
              <div className="ud-ticket-header">
                <div>
                  <div className="ud-ticket-title">🚨 {safe(a.title)}</div>
                  <div className="ud-ticket-meta" style={{marginTop:4}}>
                    <span className="ud-tracking-id">{safe(a.tracking_id)}</span>
                    <span>{safe(a.category)}</span>
                    <span className={`ud-pri-${a.priority}`}>{safe(a.priority).toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="nk-output gold" style={{marginTop:8}}>
                <div style={{fontSize:'0.75rem',color:'#64748b',marginBottom:4}}>🤖 AI Suggested Action</div>
                {safe(a.ai_draft_response)}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'meeting' && (
        <div>
          <p className="nk-ai-hint">Paste meeting notes → get key decisions and action items extracted by AI.</p>
          <div style={{display:'flex',gap:10,marginBottom:10}}>
            <select className="nk-select" value={meetingType} onChange={e => setMeetingType(e.target.value)}>
              {['general','review','grievance','development','emergency'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <textarea
            className="ud-textarea"
            rows={6}
            value={meetingNotes}
            onChange={e => setMeetingNotes(e.target.value)}
            placeholder="Paste your meeting notes here..."
          />
          <button className="ud-btn-primary" disabled={loading || !meetingNotes.trim()} onClick={summarizeMeeting} style={{marginTop:10}}>
            {loading ? '⏳ Summarizing...' : '📝 Extract Action Items'}
          </button>
          {meetingSummary && <div className="nk-output green" style={{marginTop:12,whiteSpace:'pre-wrap'}}>{meetingSummary}</div>}
        </div>
      )}

      {activeTab === 'report' && (
        <div>
          <p className="nk-ai-hint">Auto-generate &ldquo;What I Did This Month&rdquo; development report card from your constituency data.</p>
          <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center'}}>
            <select className="nk-select" value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <button className="ud-btn-primary" onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? '⏳ Generating...' : '📊 Generate Report Card'}
            </button>
          </div>
          {reportCard && (
            <div>
              <div className="ud-stats-row">
                <div className="ud-stat-card"><div className="ud-stat-num total">{reportCard.new_grievances}</div><div className="ud-stat-label">New Complaints</div></div>
                <div className="ud-stat-card"><div className="ud-stat-num resolved">{reportCard.resolved_count}</div><div className="ud-stat-label">Resolved</div></div>
                <div className="ud-stat-card"><div className="ud-stat-num" style={{color: reportCard.resolution_rate >= 60 ? '#10b981' : '#ef4444'}}>{reportCard.resolution_rate}%</div><div className="ud-stat-label">Resolution Rate</div></div>
              </div>
              {reportCard.top_categories?.length > 0 && (
                <div className="ud-chart-container">
                  <p className="ud-chart-title">Top Categories Resolved</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={reportCard.top_categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} />
                      <YAxis tick={{fill:'#475569',fontSize:11}} />
                      <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,color:'#1e293b'}} />
                      <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="nk-output green" style={{whiteSpace:'pre-wrap'}}>{reportCard.narrative}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SentinelPulse ───────────────────────────────────────
function SentinelTab() {
  const [subTab, setSubTab] = useState('map')
  const [topics, setTopics] = useState([])
  const [trends, setTrends] = useState([])
  const [comparison, setComparison] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const CHART_COLORS = ['#ef4444','#f59e0b','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16']

  const loadData = useCallback(async (tab) => {
    setLoading(true)
    try {
      if (tab === 'topics') {
        const { data } = await api.get('/sentinel/topics')
        setTopics(Array.isArray(data) ? data : [])
      } else if (tab === 'trends') {
        const { data } = await api.get('/sentinel/trends')
        setTrends(Array.isArray(data) ? data : [])
      } else if (tab === 'compare') {
        const { data } = await api.get('/sentinel/comparison')
        setComparison(Array.isArray(data) ? data : [])
      } else if (tab === 'alerts') {
        const { data } = await api.get('/sentinel/alerts')
        setAlerts(Array.isArray(data) ? data : [])
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (subTab !== 'map') loadData(subTab)
  }, [subTab, loadData])

  const SP_TABS = [
    { id: 'map',     label: '🗺️ Heatmap' },
    { id: 'topics',  label: '📊 Topics' },
    { id: 'trends',  label: '📈 Trends' },
    { id: 'compare', label: '⚖️ Compare' },
    { id: 'alerts',  label: '🚨 Alerts' },
  ]

  return (
    <div>
      <p className="ud-title">🗺️ SentinelPulse — Ward Sentiment Intelligence</p>
      <p className="ud-subtitle">Real-time ward-level grievance density, topic clusters, and trend analysis.</p>

      <div className="nk-tabs">
        {SP_TABS.map(t => (
          <button key={t.id} className={`nk-tab ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {subTab === 'map' && <SentinelHeatmap />}

      {subTab === 'topics' && (
        loading ? <p className="ud-loading">Loading topics...</p> : (
          <div>
            <p className="ud-subtitle">Open grievances grouped by AI-classified category</p>
            {topics.length > 0 ? (
              <div className="ud-chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topics} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="topic" tick={{fill:'#475569',fontSize:11}} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{fill:'#475569',fontSize:11}} />
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,color:'#1e293b'}} />
                    <Bar dataKey="count" name="Total Open" radius={[4,4,0,0]}>
                      {topics.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                    <Bar dataKey="critical" name="Critical" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="ud-alert-empty">No topic data available</div>}
            <div className="ud-topics-grid">
              {topics.map((t, i) => (
                <div key={i} className="ud-topic-card">
                  <div className="ud-topic-name" style={{color: CHART_COLORS[i % CHART_COLORS.length]}}>{t.topic}</div>
                  <div className="ud-topic-count">{t.count} open</div>
                  {t.critical > 0 && <div className="ud-topic-critical">🔴 {t.critical} critical</div>}
                  {t.negative > 0 && <div className="ud-topic-negative">😠 {t.negative} negative</div>}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {subTab === 'trends' && (
        loading ? <p className="ud-loading">Loading trends...</p> : (
          <div>
            <p className="ud-subtitle">Daily grievance volume over the last 7 days</p>
            {trends.length > 0 ? (
              <div className="ud-chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trends} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fill:'#475569',fontSize:11}} />
                    <YAxis tick={{fill:'#475569',fontSize:11}} />
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,color:'#1e293b'}} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{fill:'#3b82f6',r:4}} name="New" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{fill:'#10b981',r:4}} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="ud-alert-empty">No trend data available</div>}
          </div>
        )
      )}

      {subTab === 'compare' && (
        loading ? <p className="ud-loading">Loading comparison...</p> : (
          <div>
            <p className="ud-subtitle">Category-wise resolution rates and satisfaction scores</p>
            {comparison.length > 0 ? (
              <>
                <div className="ud-chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison} margin={{top:5,right:10,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{fill:'#475569',fontSize:11}} />
                      <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8,color:'#1e293b'}} />
                      <Bar dataKey="resolution_rate" name="Resolution %" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="satisfaction_score" name="Satisfaction %" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ud-compare-table">
                  <table>
                    <thead>
                      <tr><th>Category</th><th>Total</th><th>Resolved</th><th>Resolution %</th><th>Satisfaction</th><th>Critical</th></tr>
                    </thead>
                    <tbody>
                      {comparison.map((c,i) => (
                        <tr key={i}>
                          <td className="ud-compare-cat">{c.category}</td>
                          <td>{c.total}</td>
                          <td>{c.resolved}</td>
                          <td style={{color: c.resolution_rate >= 60 ? '#10b981' : '#ef4444'}}>{c.resolution_rate}%</td>
                          <td style={{color: c.satisfaction_score >= 60 ? '#3b82f6' : '#f59e0b'}}>{c.satisfaction_score}%</td>
                          <td style={{color: c.critical_count > 0 ? '#ef4444' : '#64748b'}}>{c.critical_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="ud-alert-empty">No comparison data available</div>}
          </div>
        )
      )}

      {subTab === 'alerts' && (
        loading ? <p className="ud-loading">Loading alerts...</p> : (
          <div>
            <p className="ud-subtitle">Critical and SLA-breached grievances requiring immediate attention</p>
            {alerts.length === 0 ? <div className="ud-alert-empty">No critical alerts. All wards are stable.</div> : (
              alerts.map((a, i) => (
                <div key={i} className="ud-card" style={{borderLeft: `3px solid ${a.severity === 'critical' ? '#ef4444' : '#f59e0b'}`}}>
                  <div className="ud-ticket-title">{safe(a.title)}</div>
                  <div className="ud-ticket-desc">{safe(a.description)}</div>
                  <div className="ud-ticket-meta" style={{marginTop:6}}>
                    <span className={`ud-badge ud-badge-${a.severity === 'critical' ? 'escalated' : 'open'}`}>{a.type}</span>
                    <span className={`ud-pri-${a.severity}`}>{safe(a.severity).toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      )}
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────
export default function UnifiedDashboard() {
  const { user, logout } = useAuth()
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)

  const role = user?.role || 'citizen'

  // Load notifications on mount
  useEffect(() => {
    api.get('/sentinel/alerts')
      .then(r => setNotifications(Array.isArray(r.data) ? r.data.slice(0, 5) : []))
      .catch(() => {})
  }, [])

  const TABS = [
    { id: 'submit',   label: '📝 Submit',         roles: ['citizen','sarpanch','district_collector','mla','mp'] },
    { id: 'mine',     label: '📋 My Complaints',  roles: ['citizen','sarpanch','district_collector','mla','mp'] },
    { id: 'manage',   label: '🗂️ Manage Tickets', roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'analytics',label: '📊 Analytics',       roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'nayak',    label: '🤖 NayakAI',         roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'sentinel', label: '🗺️ Sentinel',         roles: ['district_collector','mla','mp'] },
  ].filter(t => t.roles.includes(role))

  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit')

  const roleLabel = {
    citizen: 'Citizen',
    sarpanch: 'Sarpanch',
    district_collector: 'District Collector',
    mla: 'MLA',
    mp: 'Member of Parliament',
    officer: 'Officer',
    leader: 'Leader',
  }[role] || safe(role)

  return (
    <div className="ud-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div style={{ height: 3, background: 'linear-gradient(to right, #FF9933 33.3%, #fff 33.3%, #fff 66.6%, #138808 66.6%)' }} />

      <header className="ud-topbar">
        <div className="ud-logo">
          <div className="ud-logo-icon">P</div>
          <div>
            <div className="ud-logo-name">PRAJA</div>
            <div className="ud-logo-sub">Citizen Grievance Platform</div>
          </div>
        </div>
        <div className="ud-user-info">
          <div className="ud-notif-wrap">
            <button className="ud-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
              🔔 {notifications.length > 0 && <span className="ud-notif-badge">{notifications.length}</span>}
            </button>
            {showNotifs && (
              <div className="ud-notif-dropdown">
                <div className="ud-notif-title">Alerts</div>
                {notifications.length === 0 ? <div className="ud-notif-empty">No alerts</div> : (
                  notifications.map((n, i) => (
                    <div key={i} className={`ud-notif-item ${n.severity}`}>
                      <div className="ud-notif-item-title">{safe(n.title)}</div>
                      <div className="ud-notif-item-desc">{safe(n.description).slice(0, 80)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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
        {activeTab === 'manage'   && <ManageTicketsTab onToast={(msg, type) => setToast({ message: msg, type })} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'nayak'    && <NayakAITab />}
        {activeTab === 'sentinel' && <SentinelTab />}
      </main>
    </div>
  )
}
