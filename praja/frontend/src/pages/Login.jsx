import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const DEMO_USERS = [
  { role: 'Citizen',           level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo1234', name: 'Ramesh Kumar',    color: '#FF6600', levelBg: '#fff3eb' },
  { role: 'Sarpanch',          level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo1234', name: 'Lakshmi Devi',    color: '#006400', levelBg: '#f0faf0' },
  { role: 'District Collector', level: 'District', aadhaar: '7890 1234 5678', password: 'Demo1234', name: 'Vikram Singh',    color: '#003087', levelBg: '#f0f4ff' },
  { role: 'MLA',               level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo1234', name: 'Arjun Mehta',     color: '#7c3aed', levelBg: '#f5f0ff' },
  { role: 'MP',                level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo1234', name: 'Rajendra Prasad', color: '#b45309', levelBg: '#fffbeb' },
]

const HERO_STATS = [
  { num: '12,470+', label: 'Grievances Filed' },
  { num: '89%',     label: 'Resolution Rate' },
  { num: '5',       label: 'Districts Covered' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [aadhaar, setAadhaar]   = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [demoOpen, setDemoOpen] = useState(false)

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
        : (typeof detail === 'string' ? detail : 'Invalid Aadhaar or password. Please try again.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (u) => { setAadhaar(u.aadhaar); setPassword(u.password); setError('') }

  return (
    <div className="login-root">
      {/* Tricolor top strip */}
      <div className="login-tricolor" />

      {/* GOI Header */}
      <header className="login-goi-header">
        <div className="login-goi-left">
          <div className="login-emblem" role="img" aria-label="Government of India Emblem">🏛</div>
          <div className="login-goi-text-block">
            <div className="ministry">Government of India · Ministry of Electronics & IT</div>
            <div className="portal-name">PRAJA — Citizen Grievance Redressal Portal</div>
          </div>
        </div>
        <div className="login-goi-right">
          <span className="tricolor-flag">🇮🇳</span>
          <div className="tagline">प्रजा · प्रजातंत्र · प्रगति</div>
        </div>
      </header>

      {/* Nav strip */}
      <nav className="login-nav-strip" aria-label="Portal navigation">
        <a href="#about">About PRAJA</a>
        <a href="#help">Help & Support</a>
        <a href="#sitemap">Site Map</a>
        <a href="#accessibility">Accessibility</a>
        <a href="#" className="active">Citizen Login</a>
      </nav>

      {/* Body: hero left + form right */}
      <main className="login-body" id="main-content">
        {/* Left hero panel */}
        <section className="login-hero" aria-label="PRAJA portal introduction">
          <div className="login-hero-chakra" role="img" aria-label="Ashoka Chakra">☸</div>
          <h1 className="login-hero-title">
            One Portal.<br /><span>Every Voice.</span>
          </h1>
          <p className="login-hero-desc">
            PRAJA empowers every Indian citizen to raise grievances, track resolutions,
            and connect directly with their elected representatives — from Sarpanch to Member of Parliament.
          </p>

          <div className="login-hero-stats" role="list">
            {HERO_STATS.map(s => (
              <div key={s.label} className="login-hero-stat" role="listitem">
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="login-hero-badges">
            <span className="login-hero-badge">🔒 Aadhaar Authenticated</span>
            <span className="login-hero-badge">🤖 AI-Powered Routing</span>
            <span className="login-hero-badge">📊 Real-time Analytics</span>
          </div>
        </section>

        {/* Right form panel */}
        <section className="login-form-panel" aria-label="Sign in form">
          <div className="login-form-panel-header">
            <div className="portal-logo">
              <div className="portal-logo-icon">P</div>
              <div className="portal-logo-text">
                <div className="name">PRAJA</div>
                <div className="sub">Citizen Grievance Platform</div>
              </div>
            </div>
            <h2>Secure Sign In</h2>
            <p>Use your Aadhaar number to access your account. Your role is automatically detected.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="aadhaar-input" className="login-label">
                Aadhaar Number <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="aadhaar-input"
                className="login-input"
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChange={e => setAadhaar(formatAadhaar(e.target.value))}
                inputMode="numeric"
                maxLength={14}
                autoComplete="username"
                required
                aria-describedby="aadhaar-hint"
              />
              <div id="aadhaar-hint" className="login-hint">12-digit Aadhaar number (auto-formatted)</div>
            </div>

            <div className="login-field" style={{ marginBottom: 22 }}>
              <label htmlFor="password-input" className="login-label">
                Password / PRAJA PIN <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="password-input"
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert" aria-live="polite">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? <><span>⏳</span> Verifying...</>
                : <><span className="login-submit-icon">🔐</span> Sign In Securely</>
              }
            </button>
          </form>

          <div className="login-divider">
            <span>Demo Accounts (Testing Only)</span>
          </div>

          <div className="login-demo-section">
            <button
              className="login-demo-toggle"
              onClick={() => setDemoOpen(o => !o)}
              aria-expanded={demoOpen}
              aria-controls="demo-accounts-list"
            >
              <span>📋 Click to expand demo accounts</span>
              <span className={`login-demo-toggle-icon ${demoOpen ? 'open' : ''}`}>▼</span>
            </button>

            {demoOpen && (
              <div id="demo-accounts-list">
                <div className="login-demo-notice">
                  ⚠ These are fictional demo accounts for prototype testing. All Aadhaar numbers are made up.
                </div>
                <div className="login-demo-grid">
                  {DEMO_USERS.map(u => (
                    <button key={u.role} onClick={() => quickFill(u)} className="login-demo-btn" type="button">
                      <div>
                        <div>
                          <span className="login-demo-role" style={{ color: u.color }}>{u.role}</span>
                          <span className="login-demo-name">· {u.name}</span>
                        </div>
                        <div className="login-demo-meta">
                          <span className="login-demo-level" style={{ background: u.levelBg, color: u.color }}>
                            {u.level}
                          </span>
                          <span>Aadhaar: {u.aadhaar}</span>
                        </div>
                      </div>
                      <span className="login-demo-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <div className="login-footer-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Use</a>
          <a href="#accessibility">Accessibility Statement</a>
          <a href="#sitemap">Site Map</a>
          <a href="#help">Help</a>
        </div>
        <div>
          © 2026 PRAJA — India Innovates Prototype &nbsp;·&nbsp; Ministry of Electronics &amp; IT, Government of India
          &nbsp;·&nbsp; Aadhaar numbers shown are entirely fictional.
        </div>
      </footer>
    </div>
  )
}
