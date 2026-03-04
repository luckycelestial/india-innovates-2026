import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const STATUS_META = {
  open:        { label: 'Open',        color: '#E8590C', bg: '#FFF3EC', emoji: 'ðŸ“¬' },
  assigned:    { label: 'Assigned',    color: '#1A56DB', bg: '#EBF5FF', emoji: 'ðŸ‘®' },
  in_progress: { label: 'In Progress', color: '#9E5A00', bg: '#FFFBEB', emoji: 'ðŸ”§' },
  resolved:    { label: 'Resolved',    color: '#1A7340', bg: '#E8F5EE', emoji: 'âœ…' },
  escalated:   { label: 'Escalated',   color: '#C0392B', bg: '#FDF3F3', emoji: 'ðŸš¨' },
}
const PRIORITY_META = {
  low:      { color: '#4A5568', bg: '#F7FAFC' },
  medium:   { color: '#9E5A00', bg: '#FFFBEB' },
  high:     { color: '#C05621', bg: '#FFFAF0' },
  critical: { color: '#C0392B', bg: '#FDF3F3' },
}

export default function CitizenDashboard() {
  const { user, logout } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [view, setView] = useState('submit')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitted(null)
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
    setView('track')
    setLoadingTickets(true)
    try {
      const { data } = await api.get('/grievances/')
      setTickets(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTickets(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Tricolor strip */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />

      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>PRAJA</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem' }}>à¤¨à¤¾à¤—à¤°à¤¿à¤• à¤ªà¥‹à¤°à¥à¤Ÿà¤² Â· Citizen Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>ðŸ‘¤ {user?.name || user?.full_name}</div>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', padding: '0 20px' }}>
        {[['submit', 'ðŸ“', 'File Complaint', 'à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚'], ['track', 'ðŸ“‹', 'My Complaints', 'à¤®à¥‡à¤°à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤à¥‡à¤‚']].map(([v, emoji, label, hindi]) => (
          <button key={v} onClick={() => v === 'track' ? loadTickets() : setView(v)} style={{
            padding: '14px 20px', border: 'none', borderBottom: `3px solid ${view === v ? 'var(--saffron)' : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontWeight: view === v ? 700 : 500,
            color: view === v ? 'var(--saffron-dark)' : 'var(--muted)', fontSize: '0.88rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span>{emoji} {label}</span>
            <span style={{ fontSize: '0.6rem', fontFamily: "'Noto Sans Devanagari', sans-serif", color: view === v ? 'var(--saffron)' : 'var(--muted)' }}>{hindi}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

        {/* Submit complaint */}
        {view === 'submit' && (
          <div>
            {submitted && (
              <div style={{ background: '#E8F5EE', border: '1px solid #A3D9B5', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '1rem', marginBottom: '4px' }}>âœ… Complaint Registered!</div>
                <div style={{ fontSize: '0.85rem', color: '#2D6A4F' }}>Tracking ID: <strong style={{ fontFamily: 'monospace' }}>{submitted.tracking_id}</strong></div>
                <div style={{ fontSize: '0.82rem', color: '#2D6A4F', marginTop: '2px' }}>
                  Category: {submitted.ai_category || 'General'} Â· Priority: <span style={{ textTransform: 'capitalize' }}>{submitted.priority}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#52796F', marginTop: '6px' }}>ðŸ“² You can also track via WhatsApp: <strong>track {submitted.tracking_id}</strong></div>
              </div>
            )}

            <div style={{ background: 'var(--card)', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>ðŸ“ File a Complaint</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '20px', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>à¤…à¤ªà¤¨à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤²à¤¿à¤–à¥‡à¤‚ â€” AI à¤¤à¥à¤°à¤‚à¤¤ à¤¸à¤¹à¥€ à¤µà¤¿à¤­à¤¾à¤— à¤®à¥‡à¤‚ à¤­à¥‡à¤œà¥‡à¤—à¤¾</div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--light)', marginBottom: '6px' }}>
                    Issue Title Â· à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤•à¤¾ à¤¶à¥€à¤°à¥à¤·à¤•
                  </label>
                  <input
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '9px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                    value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. No water supply for 3 days in our area"
                    required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--light)', marginBottom: '6px' }}>
                    Describe your issue Â· à¤ªà¥‚à¤°à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤²à¤¿à¤–à¥‡à¤‚
                  </label>
                  <textarea
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '9px', fontSize: '0.92rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none', minHeight: '110px', resize: 'vertical' }}
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the problem in detail â€” location, how long it's been happening, etc."
                    required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <button type="submit" disabled={submitting} style={{
                  width: '100%', padding: '13px', background: submitting ? '#ccc' : 'var(--saffron)',
                  border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800,
                  fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                }}>
                  {submitting ? 'â³ Submitting...' : 'ðŸ“¤ Submit Complaint'}
                </button>
              </form>
            </div>

            {/* Info box */}
            <div style={{ marginTop: '16px', background: 'var(--navy-light)', borderRadius: '10px', padding: '14px 16px', border: '1px solid #C5D5F0' }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.82rem', marginBottom: '6px' }}>ðŸ’¬ You can also complain via WhatsApp!</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--light)' }}>
                Send <strong>join</strong> to WhatsApp number <strong>+1 415 523 8886</strong> first (Twilio sandbox), then send your complaint in any language.
              </div>
            </div>
          </div>
        )}

        {/* My tickets */}
        {view === 'track' && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '14px', color: 'var(--text)' }}>
              ðŸ“‹ My Complaints Â· à¤®à¥‡à¤°à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤à¥‡à¤‚
            </div>
            {loadingTickets ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>â³ Loading...</div>
            ) : tickets.length === 0 ? (
              <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>ðŸ“¬</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>No complaints yet</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>File your first complaint using the form above</div>
              </div>
            ) : (
              tickets.map(t => {
                const st = STATUS_META[t.status] || STATUS_META.open
                const pr = PRIORITY_META[t.priority] || PRIORITY_META.medium
                return (
                  <div key={t.id} style={{ background: 'var(--card)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.92rem', lineHeight: 1.4, flex: 1 }}>{t.title}</div>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                        {st.emoji} {st.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{t.tracking_id}</span>
                      {t.ai_category && <span style={{ fontSize: '0.72rem', color: 'var(--navy)', background: 'var(--navy-light)', padding: '2px 8px', borderRadius: '4px' }}>ðŸ“‚ {t.ai_category}</span>}
                      <span style={{ fontSize: '0.72rem', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: 600 }}>{t.priority}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '8px' }}>
                      ðŸ“… {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}


