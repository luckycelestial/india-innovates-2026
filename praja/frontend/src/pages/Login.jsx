import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const DEMO_USERS = [
  { role: 'Citizen',            level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo1234', name: 'Ramesh Kumar',    color: '#FF6B00' },
  { role: 'Sarpanch',           level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo1234', name: 'Lakshmi Devi',    color: '#22c55e' },
  { role: 'District Collector',  level: 'District', aadhaar: '7890 1234 5678', password: 'Demo1234', name: 'Vikram Singh',    color: '#38bdf8' },
  { role: 'MLA',                level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo1234', name: 'Arjun Mehta',     color: '#f59e0b' },
  { role: 'MP',                 level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo1234', name: 'Rajendra Prasad', color: '#a78bfa' },
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
      await login(aadhaar.replace(/\s/g, ''), password)
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

  const quickFill = (u) => { setAadhaar(u.aadhaar); setPassword(u.password); setError('') }

  return (
    <div className="login-root">
      <div className="login-tricolor" />

      <div className="login-nav">
        <div className="login-nav-icon">P</div>
        <div>
          <div className="login-nav-title">PRAJA</div>
          <div className="login-nav-sub">Citizen Grievance Platform</div>
        </div>
      </div>

      <div className="login-body">
        <div className="login-container">
          {/* Sign in card */}
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-title">Sign In to PRAJA</div>
              <div className="login-card-desc">Your role is auto-detected from your Aadhaar</div>
            </div>
            <div className="login-card-body">
              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label className="login-label">Aadhaar Number</label>
                  <input
                    className="login-input"
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaar}
                    onChange={e => setAadhaar(formatAadhaar(e.target.value))}
                    inputMode="numeric"
                    maxLength={14}
                    required
                  />
                  <div className="login-hint">12-digit Aadhaar (auto-formatted)</div>
                </div>
                <div className="login-field" style={{ marginBottom: 22 }}>
                  <label className="login-label">Password / PRAJA PIN</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="login-error">{error}</div>}
                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="login-demo">
            <div className="login-demo-heading">Demo Accounts — click to fill</div>
            <div className="login-demo-grid">
              {DEMO_USERS.map(u => (
                <button key={u.role} onClick={() => quickFill(u)} className="login-demo-btn">
                  <div>
                    <div>
                      <span className="login-demo-role" style={{ color: u.color }}>{u.role}</span>
                      <span className="login-demo-name"> · {u.name}</span>
                    </div>
                    <div className="login-demo-meta">
                      <span className="login-demo-level" style={{ background: `${u.color}18`, color: u.color }}>{u.level}</span>
                      <span>Aadhaar: {u.aadhaar}</span>
                    </div>
                  </div>
                  <span className="login-demo-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="login-footer">
        PRAJA · India Innovates 2026 · Prototype — Aadhaar numbers are fictional demo data
      </div>
    </div>
  )
}
