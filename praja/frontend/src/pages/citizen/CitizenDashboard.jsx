import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? '#138808' : '#e63946'
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: bg, color: '#fff', padding: '12px 20px',
      borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10,
      maxWidth: 340, animation: 'slideIn 0.2s ease',
    }}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <span onClick={onClose} style={{ cursor: 'pointer', opacity: 0.7, fontSize: '1.1rem' }}>×</span>
    </div>
  )
}

const SAFFRON="#FF6B00",GOLD="#f59e0b",GREEN="#22c55e",NAVY="#080f1e",CARD="#111d35",BORDER="#1e2d4d",MUTED="#64748b",LIGHT="#94a3b8",TEXT="#e2e8f0",RED="#ef4444",BLUE="#3b82f6"

const STATUS_META = {
  open:        { label: 'Open',        color: SAFFRON,   bg: `${SAFFRON}22` },
  assigned:    { label: 'Assigned',    color: BLUE,      bg: `${BLUE}22` },
  in_progress: { label: 'In Progress', color: GOLD,      bg: `${GOLD}22` },
  resolved:    { label: 'Resolved',    color: GREEN,     bg: `${GREEN}22` },
  escalated:   { label: 'Escalated',   color: RED,       bg: `${RED}22` },
}

export default function CitizenDashboard() {
  const { user, logout } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [tickets, setTickets] = useState([])
  const [tab, setTab] = useState('submit')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => { if (tab === 'history') loadTickets() }, [tab])

  const loadTickets = async () => {
    try {
      const { data } = await api.get('/grievances/')
      setTickets(Array.isArray(data) ? data : (data.items || []))
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true); setSubmitted(null)
    try {
      const { data } = await api.post('/grievances/submit', { title, description })
      setSubmitted(data)
      setTitle(''); setDescription('')
      setToast({ message: `Submitted! Tracking ID: ${data.tracking_id}`, type: 'success' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed. Please try again.'
      setError(msg)
      setToast({ message: msg, type: 'error' })
    } finally { setSubmitting(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: `1.5px solid ${BORDER}`, borderRadius: '8px', fontSize: '0.9rem', background: '#0d1526', color: TEXT, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif", color: TEXT }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      {/* TOP BAR */}
      <div style={{ background: '#0d1526', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: SAFFRON, letterSpacing: -1 }}>PRAJA</div>
          <div style={{ fontSize: '0.62rem', color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Citizen Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: LIGHT, fontSize: '0.8rem' }}>Hello, {user?.full_name || user?.name || 'Citizen'}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 6, color: LIGHT, cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      {/* MODULE TABS */}
      <div style={{ background: '#0d1526', borderBottom: `1px solid ${BORDER}`, display: 'flex', padding: '0 28px', gap: 4 }}>
        {[['submit', '📝 Submit Complaint'], ['history', '📋 My Complaints']].map(([id, lbl]) => (
          <button key={id} onClick={() => { setTab(id); if (id === 'history') loadTickets() }} style={{
            padding: '12px 18px', border: 'none', borderBottom: `3px solid ${tab === id ? SAFFRON : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontWeight: tab === id ? 700 : 400,
            color: tab === id ? SAFFRON : MUTED, fontSize: '0.85rem',
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 780, margin: '0 auto', width: '100%' }}>
        {tab === 'submit' && (
          <div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: TEXT }}>File a Complaint</div>
              <div style={{ color: MUTED, fontSize: '0.85rem', marginTop: 4 }}>Describe your issue — AI will classify and route it automatically.</div>
            </div>

            {submitted && (
              <div style={{ background: `${GREEN}11`, border: `1px solid ${GREEN}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: GREEN, marginBottom: 6 }}>✅ Complaint submitted successfully!</div>
                <div style={{ fontSize: '0.85rem', color: TEXT }}>Tracking ID: <strong style={{ fontFamily: 'monospace', color: SAFFRON }}>{submitted.tracking_id}</strong></div>
                {submitted.ai_category && <div style={{ fontSize: '0.82rem', color: LIGHT, marginTop: 4 }}>🏷 Dept: {submitted.ai_category} · {submitted.priority?.toUpperCase()} priority</div>}
                <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 4 }}>Track on WhatsApp: send <code style={{ background: CARD, padding: '1px 6px', borderRadius: 4, color: SAFFRON }}>track {submitted.tracking_id}</code></div>
              </div>
            )}

            {error && <div style={{ background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 8, padding: '12px 15px', color: RED, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}

            <div style={{ background: CARD, borderRadius: 14, padding: 24, border: `1px solid ${BORDER}` }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: MUTED, display: 'block', marginBottom: 6 }}>Title</label>
                  <input style={inp} placeholder="e.g. No water supply in our area" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: MUTED, display: 'block', marginBottom: 6 }}>Description</label>
                  <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} placeholder="Describe your issue (Tamil, Hindi, English — any language OK)"
                    value={description} onChange={e => setDescription(e.target.value)} required />
                  <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>Tamil, Hindi, Telugu, English — AI translates automatically.</div>
                </div>
                <button type="submit" disabled={submitting} style={{
                  padding: '12px 28px', background: submitting ? MUTED : `linear-gradient(90deg,${SAFFRON},${GOLD})`,
                  border: 'none', borderRadius: 8, color: '#000', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
                }}>{submitting ? 'Submitting...' : '📤 Submit Complaint'}</button>
              </form>
            </div>

            <div style={{ background: `${BLUE}11`, border: `1px solid ${BLUE}44`, borderRadius: 12, padding: '16px 18px', marginTop: 20 }}>
              <div style={{ fontWeight: 700, color: BLUE, marginBottom: 6, fontSize: '0.88rem' }}>📱 Submit via WhatsApp</div>
              <div style={{ fontSize: '0.82rem', color: LIGHT }}>Send your complaint to <strong style={{ color: TEXT }}>+1 415 523 8886</strong> on WhatsApp (sandbox). You will receive a tracking ID, department routing, and SLA timeline instantly.</div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: TEXT, marginBottom: 4 }}>My Complaints</div>
            <div style={{ color: MUTED, fontSize: '0.85rem', marginBottom: 22 }}>All complaints you have filed</div>
            {tickets.length === 0
              ? <div style={{ background: CARD, borderRadius: 12, padding: 40, textAlign: 'center', border: `1px solid ${BORDER}` }}>
                  <div style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>No complaints yet</div>
                  <div style={{ color: MUTED, fontSize: '0.85rem' }}>Submit your first complaint using the tab above.</div>
                </div>
              : tickets.map(t => {
                const sm = STATUS_META[t.status] || { label: t.status, color: LIGHT, bg: CARD }
                return (
                  <div key={t.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: TEXT }}>{t.title}</div>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: sm.bg, color: sm.color, whiteSpace: 'nowrap', marginLeft: 10 }}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: MUTED, marginBottom: 6 }}>
                      ID: <code style={{ background: '#0d1526', padding: '1px 6px', borderRadius: 4, color: SAFFRON }}>{t.tracking_id}</code>
                      {t.ai_category && <span style={{ marginLeft: 10, color: LIGHT }}>{t.ai_category}</span>}
                    </div>
                    {t.description && <div style={{ fontSize: '0.82rem', color: MUTED, borderTop: `1px solid ${BORDER}`, paddingTop: 8, marginTop: 8 }}>{t.description.substring(0, 120)}{t.description.length > 120 ? '...' : ''}</div>}
                  </div>
                )
              })
            }
          </div>
        )}
      </div>
      <style>{`*{box-sizing:border-box}input,textarea,select{background:#0d1526!important}input:focus,textarea:focus,select:focus{outline:1px solid ${SAFFRON}!important}`}</style>
    </div>
  )
}