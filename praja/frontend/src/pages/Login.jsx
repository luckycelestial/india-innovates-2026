import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAVY = '#080f1e', CARD = '#111d35', BORDER = '#1e2d4d'
const SAFFRON = '#FF6B00', GOLD = '#f59e0b', MUTED = '#64748b'
const TEXT = '#e2e8f0', LIGHT = '#94a3b8', RED = '#ef4444', GREEN = '#22c55e'

const DEMO_USERS = [
  { role: 'Citizen',            level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo1234', name: 'Ramesh Kumar',     color: SAFFRON },
  { role: 'Sarpanch',           level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo1234', name: 'Lakshmi Devi',     color: '#22c55e' },
  { role: 'District Collector',  level: 'District', aadhaar: '7890 1234 5678', password: 'Demo1234', name: 'Vikram Singh',     color: '#38bdf8' },
  { role: 'MLA',                level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo1234', name: 'Arjun Mehta',      color: GOLD },
  { role: 'MP',                 level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo1234', name: 'Rajendra Prasad',  color: '#a78bfa' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [aadhaar, setAadhaar] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const raw = aadhaar.replace(/\s/g, '')
      const userData = await login(raw, password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => (typeof d === 'object' ? (d.msg || JSON.stringify(d)) : String(d))).join('; ')
        : (typeof detail === 'string' ? detail : 'Invalid Aadhaar or password')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (u) => {
    setAadhaar(u.aadhaar)
    setPassword(u.password)
    setError('')
  }

  const inp = {
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${BORDER}`, borderRadius: '8px',
    fontSize: '0.95rem', background: '#0d1526', color: TEXT,
    outline: 'none', fontFamily: 'inherit', letterSpacing: '0.05em',
  }

  return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif", color: TEXT }}>
      {/* Tricolor strip */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, #FF9933 33.3%, white 33.3%, white 66.6%, #138808 66.6%)' }} />

      {/* Nav */}
      <div style={{ background: '#0d1526', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ width: 34, height: 34, background: SAFFRON, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem' }}>P</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: 1 }}>PRAJA</div>
          <div style={{ color: MUTED, fontSize: '0.6rem', letterSpacing: 2, textTransform: 'uppercase' }}>Citizen Grievance Platform</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Login card */}
          <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: `1px solid ${BORDER}` }}>
            <div style={{ background: `linear-gradient(135deg, ${SAFFRON}22, #0d1526)`, borderBottom: `1px solid ${BORDER}`, padding: '22px 28px' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: SAFFRON }}>Sign In to PRAJA</div>
              <div style={{ color: MUTED, fontSize: '0.82rem', marginTop: 3 }}>Your role is auto-detected from your Aadhaar</div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>Aadhaar Number</label>
                  <input
                    style={inp}
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaar}
                    onChange={e => setAadhaar(formatAadhaar(e.target.value))}
                    inputMode="numeric"
                    maxLength={14}
                    required
                    onFocus={e => e.target.style.borderColor = SAFFRON}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                  <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 4 }}>12-digit Aadhaar (auto-formatted)</div>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>Password / PRAJA PIN</label>
                  <input
                    style={inp}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    onFocus={e => e.target.style.borderColor = SAFFRON}
                    onBlur={e => e.target.style.borderColor = BORDER}
                  />
                </div>

                {error && (
                  <div style={{ background: `${RED}15`, border: `1px solid ${RED}44`, borderRadius: 8, padding: '10px 14px', color: RED, fontSize: '0.83rem', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 9, border: 'none',
                  background: loading ? MUTED : `linear-gradient(90deg, ${SAFFRON}, ${GOLD})`,
                  color: '#000', fontWeight: 800, fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
            </div>
          </div>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: MUTED, marginBottom: 12 }}>Demo Accounts — click to fill</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_USERS.map(u => (
                <button key={u.role} onClick={() => quickFill(u)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: '#0d1526', cursor: 'pointer', color: TEXT, fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: u.color }}>{u.role} · {u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>
                      <span style={{ color: u.color, fontWeight: 600 }}>{u.level}</span> · Aadhaar: {u.aadhaar} · pw: {u.password}
                    </div>
                  </div>
                  <span style={{ color: MUTED, fontSize: '0.75rem' }}>Use →</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '12px', color: MUTED, fontSize: '0.72rem', borderTop: `1px solid ${BORDER}` }}>
        PRAJA · India Innovates 2026 · Prototype — Aadhaar numbers are fictional demo data
      </div>
    </div>
  )
}
