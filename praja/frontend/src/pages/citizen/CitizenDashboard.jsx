import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const STATUS_META = {
  open:        { label: 'Open',        color: '#E8590C', bg: '#FFF3EC' },
  assigned:    { label: 'Assigned',    color: '#1A56DB', bg: '#EBF5FF' },
  in_progress: { label: 'In Progress', color: '#9E5A00', bg: '#FFFBEB' },
  resolved:    { label: 'Resolved',    color: '#1A7340', bg: '#E8F5EE' },
  escalated:   { label: 'Escalated',   color: '#C0392B', bg: '#FDF3F3' },
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
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem', background: '#FAFBFF', color: 'var(--text)', outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />

      <div style={{ background: 'var(--navy)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>PRAJA</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Citizen Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Hello, {user?.full_name || user?.name || 'Citizen'}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', padding: '0 24px' }}>
        {[['submit', 'Submit Complaint'], ['history', 'My Complaints']].map(([id, lbl]) => (
          <button key={id} onClick={() => { setTab(id); if (id === 'history') loadTickets() }} style={{
            padding: '13px 20px', border: 'none', borderBottom: `3px solid ${tab === id ? 'var(--saffron)' : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontWeight: tab === id ? 700 : 500,
            color: tab === id ? 'var(--saffron)' : 'var(--muted)', fontSize: '0.88rem',
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '24px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>

        {tab === 'submit' && (
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>File a Complaint</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '22px' }}>Describe your issue and our AI will classify and route it automatically.</p>

            {submitted && (
              <div style={{ background: '#E8F5EE', border: '1px solid #A3D9B8', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '6px' }}>Complaint submitted successfully!</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Tracking ID: <strong style={{ fontFamily: 'monospace', color: 'var(--navy)' }}>{submitted.tracking_id}</strong></div>
                {submitted.ai_category && <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '4px' }}>Routed to: {submitted.ai_category} &bull; Priority: {submitted.priority}</div>}
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>Track on WhatsApp: send <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: '4px' }}>track {submitted.tracking_id}</code></div>
              </div>
            )}

            {error && <div style={{ background: '#FDF3F3', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '12px 15px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>}

            <div style={{ background: 'var(--card)', borderRadius: '14px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Title</label>
                  <input style={inp} placeholder="e.g. No water supply in our area" value={title} onChange={e => setTitle(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea style={{ ...inp, minHeight: '100px', resize: 'vertical' }} placeholder="Describe your issue in detail (Tamil, Hindi, English - any language ok)"
                    value={description} onChange={e => setDescription(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>You can write in Tamil, Hindi, Telugu or English - AI will translate automatically.</div>
                </div>
                <button type="submit" disabled={submitting} style={{
                  padding: '12px 28px', background: submitting ? '#ccc' : 'var(--saffron)',
                  border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
                }}>
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </form>
            </div>

            <div style={{ background: 'var(--navy-light)', border: '1px solid #C5D5F0', borderRadius: '12px', padding: '16px 18px', marginTop: '20px' }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '6px', fontSize: '0.88rem' }}>Submit via WhatsApp</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Send your complaint to <strong>+1 415 523 8886</strong> on WhatsApp (sandbox). You will receive a tracking ID instantly.</div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '4px' }}>My Complaints</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '22px' }}>All complaints you have filed</p>
            {tickets.length === 0
              ? <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>No complaints yet</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Submit your first complaint using the tab above.</div>
                </div>
              : tickets.map(t => {
                const sm = STATUS_META[t.status] || { label: t.status, color: '#555', bg: '#eee' }
                return (
                  <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: sm.bg, color: sm.color, whiteSpace: 'nowrap', marginLeft: '10px' }}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '6px' }}>
                      ID: <code style={{ background: 'var(--bg)', padding: '1px 6px', borderRadius: '4px' }}>{t.tracking_id}</code>
                      {t.ai_category && <span style={{ marginLeft: '10px' }}>{t.ai_category}</span>}
                    </div>
                    {t.description && <div style={{ fontSize: '0.82rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>{t.description.substring(0, 120)}{t.description.length > 120 ? '...' : ''}</div>}
                  </div>
                )
              })
            }
          </div>
        )}
      </div>
    </div>
  )
}