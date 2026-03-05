import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ─── Design tokens ──────────────────────────────────────
const NAVY   = '#080f1e'
const CARD   = '#111d35'
const BORDER = '#1e2d4d'
const SAFFRON = '#FF6B00'
const GOLD   = '#f59e0b'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const BLUE   = '#3b82f6'
const MUTED  = '#64748b'
const LIGHT  = '#94a3b8'
const TEXT   = '#e2e8f0'

const STATUS_META = {
  open:        { label: 'Open',        color: SAFFRON, bg: `${SAFFRON}22` },
  assigned:    { label: 'Assigned',    color: BLUE,    bg: `${BLUE}22` },
  in_progress: { label: 'In Progress', color: GOLD,    bg: `${GOLD}22` },
  resolved:    { label: 'Resolved',    color: GREEN,   bg: `${GREEN}22` },
  escalated:   { label: 'Escalated',   color: RED,     bg: `${RED}22` },
}

const PRIORITY_COLOR = { low: LIGHT, medium: GOLD, high: SAFFRON, critical: RED }

// ─── Toast ──────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: type === 'success' ? '#138808' : '#e63946',
      color: '#fff', padding: '12px 20px', borderRadius: 10,
      fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340, animation: 'slideIn 0.2s ease',
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '1.1rem', opacity: 0.7 }}>×</span>
    </div>
  )
}

// ─── Shared input style ─────────────────────────────────
const INP = {
  width: '100%', padding: '11px 14px',
  border: `1.5px solid ${BORDER}`, borderRadius: 8,
  fontSize: '0.9rem', background: '#0d1526', color: TEXT,
  outline: 'none', fontFamily: 'inherit',
}

// ─── Submit Complaint tab ───────────────────────────────
function SubmitTab({ onToast }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true); setSubmitted(null)
    try {
      const { data } = await api.post('/grievances/submit', { title, description })
      setSubmitted(data)
      setTitle(''); setDescription('')
      onToast(`✅ Submitted — tracking ID: ${data.tracking_id}`, 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed'
      setError(msg)
      onToast(`❌ ${msg}`, 'error')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>File a Complaint</div>
        <div style={{ color: MUTED, fontSize: '0.84rem', marginTop: 3 }}>AI will auto-classify department and priority. Supports Tamil, Hindi, Telugu, English.</div>
      </div>

      {submitted && (
        <div style={{ background: `${GREEN}11`, border: `1px solid ${GREEN}44`, borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, color: GREEN }}>✅ Complaint submitted</div>
          <div style={{ fontSize: '0.85rem', color: TEXT, marginTop: 4 }}>
            ID: <strong style={{ fontFamily: 'monospace', color: SAFFRON }}>{submitted.tracking_id}</strong>
            {submitted.ai_category && <span style={{ color: LIGHT, marginLeft: 10 }}>📂 {submitted.ai_category} · <span style={{ color: PRIORITY_COLOR[submitted.priority] }}>{submitted.priority?.toUpperCase()}</span></span>}
          </div>
        </div>
      )}
      {error && <div style={{ background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 8, padding: '12px 14px', color: RED, fontSize: '0.84rem', marginBottom: 14 }}>{error}</div>}

      <div style={{ background: CARD, borderRadius: 14, padding: 24, border: `1px solid ${BORDER}` }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>Title</label>
            <input style={INP} placeholder="e.g. No water supply in our area" value={title} onChange={e => setTitle(e.target.value)} required
              onFocus={e => e.target.style.borderColor = SAFFRON} onBlur={e => e.target.style.borderColor = BORDER} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea style={{ ...INP, minHeight: 90, resize: 'vertical' }} placeholder="Describe your issue in any language" value={description} onChange={e => setDescription(e.target.value)} required
              onFocus={e => e.target.style.borderColor = SAFFRON} onBlur={e => e.target.style.borderColor = BORDER} />
          </div>
          <button type="submit" disabled={submitting} style={{
            padding: '11px 28px', borderRadius: 8, border: 'none',
            background: submitting ? MUTED : `linear-gradient(90deg,${SAFFRON},${GOLD})`,
            color: '#000', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
          }}>{submitting ? 'Submitting...' : '📤 Submit Complaint'}</button>
        </form>
      </div>
    </div>
  )
}

// ─── My Complaints tab (citizen's own) ─────────────────
function MyComplaintsTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/grievances/')
      .then(r => setTickets(Array.isArray(r.data) ? r.data : (r.data.items || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: MUTED, padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>My Complaints</div>
      <div style={{ color: MUTED, fontSize: '0.84rem', marginBottom: 20 }}>{tickets.length} complaint{tickets.length !== 1 ? 's' : ''} filed</div>
      {tickets.length === 0 ? (
        <div style={{ background: CARD, borderRadius: 12, padding: 40, textAlign: 'center', border: `1px solid ${BORDER}`, color: MUTED }}>No complaints yet. Use "Submit" tab to file one.</div>
      ) : tickets.map(t => {
        const sm = STATUS_META[t.status] || { label: t.status, color: LIGHT, bg: CARD }
        return (
          <div key={t.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.title}</div>
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: sm.bg, color: sm.color, whiteSpace: 'nowrap', marginLeft: 10 }}>{sm.label}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: MUTED }}>
              <code style={{ background: '#0d1526', padding: '1px 7px', borderRadius: 4, color: SAFFRON }}>{t.tracking_id}</code>
              {t.ai_category && <span style={{ marginLeft: 10 }}>{t.ai_category}</span>}
              {t.priority && <span style={{ marginLeft: 6, color: PRIORITY_COLOR[t.priority], fontWeight: 700 }}>{t.priority.toUpperCase()}</span>}
            </div>
            {t.description && <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>{t.description.slice(0, 120)}{t.description.length > 120 ? '…' : ''}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Manage Tickets tab (officer + leader) ──────────────
function ManageTicketsTab() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = { limit: 100 }
    if (statusFilter) params.status = statusFilter
    api.get('/officers/tickets', { params })
      .then(r => setTickets(Array.isArray(r.data) ? r.data : (r.data.items || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.put(`/grievances/${id}/status`, { status })
      load()
    } catch (e) { alert(e.response?.data?.detail || 'Error') }
    finally { setUpdating(null) }
  }

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {})

  return (
    <div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6 }}>Manage Tickets</div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {[['open', SAFFRON], ['in_progress', GOLD], ['resolved', GREEN], ['escalated', RED]].map(([s, c]) => (
          <div key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} style={{
            background: statusFilter === s ? `${c}22` : CARD, border: `1px solid ${statusFilter === s ? c : BORDER}`,
            borderRadius: 10, padding: '10px 16px', cursor: 'pointer', minWidth: 90,
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: c }}>{counts[s] || 0}</div>
            <div style={{ fontSize: '0.68rem', color: MUTED, textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
          </div>
        ))}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 16px', minWidth: 90 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: TEXT }}>{tickets.length}</div>
          <div style={{ fontSize: '0.68rem', color: MUTED }}>total</div>
        </div>
      </div>

      {loading ? <div style={{ color: MUTED, padding: 40, textAlign: 'center' }}>Loading...</div>
      : tickets.length === 0 ? <div style={{ background: CARD, borderRadius: 12, padding: 40, textAlign: 'center', color: MUTED, border: `1px solid ${BORDER}` }}>No tickets found</div>
      : tickets.map(t => {
        const sm = STATUS_META[t.status] || { label: t.status, color: LIGHT, bg: CARD }
        return (
          <div key={t.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: '0.75rem', color: MUTED, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <code style={{ color: SAFFRON, background: '#0d1526', padding: '1px 6px', borderRadius: 4 }}>{t.tracking_id}</code>
                  {t.ai_category && <span>{t.ai_category}</span>}
                  {t.priority && <span style={{ color: PRIORITY_COLOR[t.priority], fontWeight: 700 }}>{t.priority.toUpperCase()}</span>}
                </div>
              </div>
              <select
                value={t.status}
                onChange={e => updateStatus(t.id, e.target.value)}
                disabled={updating === t.id}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${sm.color}55`, background: sm.bg, color: sm.color, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {['open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(s => (
                  <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                ))}
              </select>
            </div>
            {t.description && <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>{t.description.slice(0, 100)}{t.description.length > 100 ? '…' : ''}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ─── NayakAI tab (leader) ───────────────────────────────
function NayakAITab() {
  const [activeTab, setActiveTab] = useState('brief')
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBL] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [speechTopic, setST] = useState('')
  const [speechLang, setSL] = useState('English')
  const [loading, setLoading] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => { if (activeTab === 'brief' && !brief) loadBrief() }, [activeTab])

  const loadBrief = async () => {
    setBL(true)
    try { const { data } = await api.post('/nayakai/morning-brief', {}); setBrief(data) }
    catch (e) { console.error(e) } finally { setBL(false) }
  }

  const callBackend = async (text, mode) => {
    setLoading(true); setAiOutput('')
    try { const { data } = await api.post('/nayakai/assist', { text, mode }); setAiOutput(data.result || 'No response') }
    catch { setAiOutput('⚠️ Connection error') } finally { setLoading(false) }
  }

  const sendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = chatInput.trim(); setChatInput('')
    setChatHistory(h => [...h, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const { data } = await api.post('/nayakai/ask', { question: msg, constituency: 'Delhi North' })
      setChatHistory(h => [...h, { role: 'ai', text: data.answer }])
    } catch { setChatHistory(h => [...h, { role: 'ai', text: '⚠️ Error. Try again.' }]) }
    finally { setChatLoading(false) }
  }

  const tabs = [{ id: 'brief', label: '☀️ Brief' }, { id: 'chat', label: '💬 Chat' }, { id: 'doc', label: '📄 Summarize' }, { id: 'speech', label: '✍️ Speech' }]

  return (
    <div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>🤖 NayakAI — Leader Intelligence</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setAiOutput('') }} style={{
            padding: '7px 14px', borderRadius: 8, border: `1px solid ${activeTab === t.id ? SAFFRON : BORDER}`,
            background: activeTab === t.id ? `${SAFFRON}22` : 'transparent',
            color: activeTab === t.id ? SAFFRON : LIGHT, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Morning Brief */}
      {activeTab === 'brief' && (
        briefLoading ? <div style={{ color: MUTED, padding: 40, textAlign: 'center' }}>Generating brief...</div>
        : brief ? (
          <div>
            <div style={{ background: `${SAFFRON}11`, border: `1px solid ${SAFFRON}44`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: SAFFRON, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>MORNING BRIEF — {brief.date}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '12px 0' }}>
                {[['Open', brief.total_open, SAFFRON], ['Critical', brief.critical_open, RED], ['SLA Breaches', brief.sla_violations, GOLD]].map(([l, v, c]) => (
                  <div key={l} style={{ background: `${c}11`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${c}44` }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: c }}>{v ?? '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>{l}</div>
                  </div>
                ))}
              </div>
              {brief.summary && <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, fontSize: '0.83rem', color: LIGHT, lineHeight: 1.65, border: `1px solid ${BORDER}` }}>{brief.summary}</div>}
            </div>
            <button onClick={loadBrief} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${SAFFRON}55`, background: `${SAFFRON}11`, color: SAFFRON, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          </div>
        ) : (
          <button onClick={loadBrief} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: `linear-gradient(90deg,${SAFFRON},${GOLD})`, color: '#000', fontWeight: 700, cursor: 'pointer' }}>☀️ Generate Morning Brief</button>
        )
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatHistory.length === 0 && <div style={{ color: MUTED, textAlign: 'center', marginTop: 60, fontSize: '0.84rem' }}>Ask anything — grievances, schemes, ward stats, governance</div>}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                background: msg.role === 'user' ? `${SAFFRON}33` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${msg.role === 'user' ? SAFFRON + '55' : BORDER}`,
                fontSize: '0.84rem', color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {msg.role === 'ai' && <div style={{ fontSize: '0.65rem', color: SAFFRON, fontWeight: 700, marginBottom: 4 }}>🤖 NAYAKAI</div>}
                {msg.text}
              </div>
            ))}
            {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED, fontSize: '0.84rem' }}>🤖 Thinking...</div>}
          </div>
          <form onSubmit={sendChat} style={{ display: 'flex', gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask NayakAI anything..." style={{ ...INP, flex: 1 }} />
            <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: chatLoading ? MUTED : `linear-gradient(90deg,${SAFFRON},${GOLD})`, color: '#000', fontWeight: 700, cursor: chatLoading ? 'not-allowed' : 'pointer' }}>Send</button>
          </form>
        </div>
      )}

      {/* Doc Summarizer */}
      {activeTab === 'doc' && (
        <div>
          <div style={{ fontSize: '0.8rem', color: LIGHT, marginBottom: 8 }}>Paste any government document or scheme description:</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. PM Awas Yojana guidelines..." rows={4}
            style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} />
          <button onClick={() => callBackend(prompt, 'summarize')} disabled={loading || !prompt.trim()} style={{
            marginTop: 10, padding: '9px 20px', borderRadius: 8, border: 'none',
            background: loading ? MUTED : `linear-gradient(90deg,${SAFFRON},${GOLD})`,
            color: '#000', fontWeight: 700, fontSize: '0.83rem', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 14,
          }}>{loading ? '⏳ Summarizing...' : '🧠 Summarize'}</button>
          {aiOutput && <div style={{ background: '#0d1526', border: `1px solid ${GREEN}44`, borderRadius: 10, padding: 14, whiteSpace: 'pre-wrap', fontSize: '0.83rem', color: TEXT, lineHeight: 1.7 }}>{aiOutput}</div>}
        </div>
      )}

      {/* Speech Drafter */}
      {activeTab === 'speech' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input value={speechTopic} onChange={e => setST(e.target.value)} placeholder="Event: e.g. Inauguration of Community Park"
              style={{ ...INP, flex: 1 }} />
            <select value={speechLang} onChange={e => setSL(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#0d1526', color: TEXT, fontSize: '0.83rem' }}>
              {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={() => callBackend(`Event: ${speechTopic}. Language: ${speechLang}. Constituency: Delhi North.`, 'speech')}
            disabled={loading || !speechTopic.trim()} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: loading ? MUTED : `linear-gradient(90deg,${SAFFRON},${GOLD})`,
              color: '#000', fontWeight: 700, fontSize: '0.83rem', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 14,
            }}>{loading ? '⏳ Drafting...' : '✍️ Draft Speech'}</button>
          {aiOutput && <div style={{ background: '#0d1526', border: `1px solid ${GOLD}44`, borderRadius: 10, padding: 16, whiteSpace: 'pre-wrap', fontSize: '0.84rem', color: TEXT, lineHeight: 1.8 }}>{aiOutput}</div>}
        </div>
      )}
    </div>
  )
}

// ─── SentinelPulse tab (leader) ─────────────────────────
const WARD_DATA = [
  { id: 1,  name: 'Connaught Place', score: 72, issues: ['Road maintenance', 'Parking'],            trend: '+5%' },
  { id: 3,  name: 'Karol Bagh',      score: 38, issues: ['Garbage', 'Water shortage'],              trend: '-12%' },
  { id: 7,  name: 'Rohini',          score: 21, issues: ['Water supply', 'Power cuts', 'Drainage'], trend: '-23%' },
  { id: 11, name: 'Dwarka',          score: 61, issues: ['Traffic lights', 'Parks'],                trend: '+8%' },
  { id: 14, name: 'Saket',           score: 45, issues: ['Street lights', 'Potholes'],              trend: '-6%' },
  { id: 19, name: 'Okhla',           score: 18, issues: ['Sewage', 'Flooding', 'Healthcare'],       trend: '-31%' },
  { id: 22, name: 'Lajpat Nagar',    score: 54, issues: ['Road conditions', 'Noise'],               trend: '-4%' },
  { id: 28, name: 'Janakpuri',       score: 83, issues: ['Minor road issues'],                      trend: '+11%' },
]

function scoreColor(s) { return s >= 70 ? GREEN : s >= 45 ? GOLD : s >= 25 ? SAFFRON : RED }

function SentinelTab() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6 }}>🗺️ SentinelPulse — Ward Sentiment</div>
      <div style={{ color: MUTED, fontSize: '0.84rem', marginBottom: 18 }}>Real-time mood index per ward. Click any ward for details.</div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {[['Satisfied 70+', GREEN], ['Moderate 45–70', GOLD], ['Tense 25–45', SAFFRON], ['Crisis <25', RED]].map(([l, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: LIGHT }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        {WARD_DATA.map(w => {
          const c = scoreColor(w.score)
          const isSelected = selected?.id === w.id
          return (
            <div key={w.id} onClick={() => setSelected(isSelected ? null : w)} style={{
              background: `${c}15`, border: `2px solid ${isSelected ? c : c + '44'}`,
              borderRadius: 12, padding: '12px 10px', cursor: 'pointer',
              transform: isSelected ? 'scale(1.04)' : 'scale(1)', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: 2 }}>Ward {w.id}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c, lineHeight: 1 }}>{w.score}</div>
              <div style={{ fontSize: '0.65rem', color: c, fontWeight: 700, marginTop: 2 }}>{w.trend}</div>
              <div style={{ fontSize: '0.7rem', color: LIGHT, marginTop: 4 }}>{w.name}</div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background: CARD, border: `1px solid ${scoreColor(selected.score)}55`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: scoreColor(selected.score), marginBottom: 4 }}>Ward {selected.id} — {selected.name}</div>
          <div style={{ fontSize: '0.84rem', color: MUTED, marginBottom: 12 }}>Sentiment score: <strong style={{ color: scoreColor(selected.score) }}>{selected.score}/100</strong> · Trend: <strong>{selected.trend}</strong></div>
          <div style={{ fontSize: '0.72rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Top Issues</div>
          {selected.issues.map((issue, i) => (
            <div key={i} style={{ padding: '7px 12px', marginBottom: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: '0.84rem', color: TEXT }}>
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: '0.72rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Critical Alerts</div>
        {WARD_DATA.filter(w => w.score < 25).map(w => (
          <div key={w.id} style={{ background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, color: RED }}>🚨 Ward {w.id} — {w.name}</span>
              <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 2 }}>Score: {w.score} · {w.issues.join(', ')}</div>
            </div>
            <span style={{ color: RED, fontWeight: 900, fontSize: '1rem' }}>{w.trend}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Unified Dashboard ─────────────────────────────
export default function UnifiedDashboard() {
  const { user, logout } = useAuth()
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const role = user?.role || 'citizen'

  // Build tabs based on role
  const tabs = [
    { id: 'submit',   label: '📝 Submit',        roles: ['citizen', 'officer', 'leader'] },
    { id: 'mine',     label: '📋 My Complaints', roles: ['citizen', 'officer', 'leader'] },
    { id: 'manage',   label: '🗂️ Manage Tickets', roles: ['officer', 'leader'] },
    { id: 'nayak',    label: '🤖 NayakAI',        roles: ['leader'] },
    { id: 'sentinel', label: '🗺️ Sentinel',        roles: ['leader'] },
  ].filter(t => t.roles.includes(role))

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'submit')

  const roleColor = role === 'leader' ? GOLD : role === 'officer' ? BLUE : SAFFRON
  const roleLabel = role === 'leader' ? 'Leader' : role === 'officer' ? 'Officer' : 'Citizen'

  return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif", color: TEXT }}>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}*{box-sizing:border-box}input,textarea,select{background:#0d1526!important}`}</style>
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}

      {/* Top bar */}
      <div style={{ background: '#0d1526', borderBottom: `1px solid ${BORDER}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: SAFFRON, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>P</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: 1, color: 'white' }}>PRAJA</div>
            <div style={{ fontSize: '0.6rem', color: MUTED, letterSpacing: 2, textTransform: 'uppercase' }}>Citizen Grievance Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: TEXT }}>Hello, {user?.name || 'User'}</div>
            <div style={{ fontSize: '0.68rem', color: roleColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{roleLabel}</div>
          </div>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 6, color: LIGHT, cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ background: '#0d1526', borderBottom: `1px solid ${BORDER}`, display: 'flex', padding: '0 24px', gap: 2, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '12px 18px', border: 'none', borderBottom: `3px solid ${activeTab === t.id ? roleColor : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? roleColor : MUTED, fontSize: '0.85rem', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {activeTab === 'submit'   && <SubmitTab onToast={(msg, type) => setToast({ message: msg, type })} />}
        {activeTab === 'mine'     && <MyComplaintsTab />}
        {activeTab === 'manage'   && <ManageTicketsTab />}
        {activeTab === 'nayak'    && <NayakAITab />}
        {activeTab === 'sentinel' && <SentinelTab />}
      </div>
    </div>
  )
}
