import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const S = {
  wrap:    { minHeight: '100vh', background: 'var(--navy)', padding: '24px' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  logo:    { fontSize: '1.3rem', fontWeight: 900, color: 'var(--saffron)' },
  name:    { fontSize: '0.82rem', color: 'var(--light)' },
  logoutBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--light)', cursor: 'pointer', fontSize: '0.82rem' },
  card:    { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '20px' },
  title:   { fontWeight: 800, fontSize: '1.1rem', marginBottom: '6px' },
  desc:    { color: 'var(--light)', fontSize: '0.85rem', marginBottom: '20px' },
  label:   { fontSize: '0.72rem', fontWeight: 700, color: 'var(--light)', letterSpacing: '1px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' },
  input:   { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '0.88rem', marginBottom: '12px', outline: 'none' },
  textarea:{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '0.88rem', marginBottom: '12px', outline: 'none', minHeight: '100px', resize: 'vertical' },
  btn:     { background: 'linear-gradient(135deg, var(--saffron), var(--gold))', border: 'none', borderRadius: '8px', padding: '11px 24px', color: '#000', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' },
  badge:   (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: `rgba(${color},0.15)`, border: `1px solid rgba(${color},0.35)`, color: `rgb(${color})`, marginRight: '6px' }),
  ticketRow: { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' },
  trackId: { color: 'var(--saffron)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' },
  ticketTitle: { fontWeight: 600, marginBottom: '4px' },
  statusColors: { open: '255,107,0', assigned: '59,130,246', in_progress: '245,158,11', resolved: '34,197,94', escalated: '239,68,68' },
  success: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '14px 16px', color: '#86efac', marginBottom: '16px', fontSize: '0.88rem' },
}

export default function CitizenDashboard() {
  const { user, logout } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [tickets, setTickets] = useState([])
  const [view, setView] = useState('submit')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/grievances/submit', { title, description })
      setSubmitted(data)
      setTitle('')
      setDescription('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const loadTickets = async () => {
    try {
      const { data } = await api.get('/grievances/')
      setTickets(data)
    } catch (err) {
      console.error(err)
    }
    setView('track')
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>PRAJA</div>
          <div style={S.name}>Welcome, {user?.name} &middot; Citizen Portal</div>
        </div>
        <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {[['submit', 'File Complaint'], ['track', 'My Complaints']].map(([v, label]) => (
          <button key={v} onClick={() => v === 'track' ? loadTickets() : setView(v)}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: view === v ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)', color: view === v ? 'var(--saffron)' : 'var(--light)', fontWeight: 600, fontSize: '0.85rem' }}>
            {label}
          </button>
        ))}
      </div>
      {view === 'submit' && (
        <div style={S.card}>
          <div style={S.title}>File a Complaint</div>
          <div style={S.desc}>Your complaint will be automatically classified and assigned to the right department using AI.</div>
          {submitted && (
            <div style={S.success}>
              Complaint registered! Tracking ID: <strong>{submitted.tracking_id}</strong> &middot; Priority: <strong>{submitted.priority}</strong>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <label style={S.label}>Issue Title</label>
            <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. No water supply in our area for 3 days" required />
            <label style={S.label}>Describe Your Issue</label>
            <textarea style={S.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details..." required />
            <button style={S.btn} type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
      )}
      {view === 'track' && (
        <div style={S.card}>
          <div style={S.title}>My Complaints</div>
          {tickets.length === 0
            ? <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No complaints found.</div>
            : tickets.map(t => (
              <div key={t.tracking_id} style={S.ticketRow}>
                <div style={S.trackId}>{t.tracking_id}</div>
                <div style={S.ticketTitle}>{t.title}</div>
                <span style={S.badge(S.statusColors[t.status] || '100,116,139')}>{t.status}</span>
                <span style={S.badge('100,116,139')}>{t.priority}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
