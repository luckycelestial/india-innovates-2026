import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prajaLogo   from '../assets/RR.jpg';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Login.css';

const DEMO_USERS = [
  { role: 'Citizen',            level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo', name: 'Ramesh Kumar',    color: '#ff7a2f', levelBg: 'rgba(255,107,0,0.12)' },
  { role: 'Sarpanch',           level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo', name: 'Lakshmi Devi',    color: '#22c55e', levelBg: 'rgba(34,197,94,0.12)' },
  { role: 'District Collector', level: 'District', aadhaar: '7890 1234 5678', password: 'Demo', name: 'Vikram Singh',    color: '#38bdf8', levelBg: 'rgba(56,189,248,0.12)' },
  { role: 'MLA',                level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo', name: 'Arjun Mehta',     color: '#a78bfa', levelBg: 'rgba(167,139,250,0.12)' },
  { role: 'MP',                 level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo', name: 'Rajendra Prasad', color: '#fbbf24', levelBg: 'rgba(251,191,36,0.12)' },
];

const HERO_STATS = [
  { num: '12,470+', label: 'Grievances Filed' },
  { num: '89%',     label: 'Resolution Rate' },
  { num: '5',       label: 'Districts Active' },
];

const formatAadhaar = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(' ')
  );
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(aadhaar.replace(/\s/g, ''), password);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => (typeof d === 'object' ? (d.msg || JSON.stringify(d)) : String(d))).join('; ')
        : (typeof detail === 'string' ? detail : 'Invalid Aadhaar or password. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u) => {
    setAadhaar(u.aadhaar);
    setPassword(u.password);
    setError('');
  };

  return (
    <div className="login-root">
      {/* Tricolor strip */}
      <div className="login-tricolor" aria-hidden="true" />

      {/* GOI Header */}
      <header className="login-goi-header">
        <div className="login-goi-left">
          <div className="login-emblem" role="img" aria-label="Government of India Emblem">🏛</div>
          <div className="login-goi-text-block">
            <div className="ministry">Government of India · Ministry of Electronics &amp; IT</div>
            <div className="portal-name">PRAJA — Citizen Grievance Redressal Portal</div>
          </div>
        </div>
        <div className="login-goi-right hidden sm:flex">
          <span role="img" aria-label="Indian flag" style={{ fontSize: '1.4rem' }}>🇮🇳</span>
          <div className="tagline">प्रजा · प्रजातंत्र · प्रगति</div>
        </div>
      </header>

      {/* Nav strip */}
      <nav className="login-nav-strip overflow-x-auto whitespace-nowrap" aria-label="Portal navigation">
        <a href="#about">About PRAJA</a>
        <a href="#help">Help &amp; Support</a>
        <a href="#sitemap">Site Map</a>
        <a href="#accessibility">Accessibility</a>
        <a href="#login" className="active">Citizen Login</a>
      </nav>

      {/* Body */}
      <main className="login-body" id="main-content">

        {/* ── Hero panel ── */}
        <section className="login-hero" aria-label="PRAJA portal introduction">
          <div className="login-hero-bg-grid" aria-hidden="true" />
          <div className="login-hero-content">
            <div className="login-hero-chakra" role="img" aria-label="Ashoka Chakra">☸</div>
            <h1 className="login-hero-title">
              One Portal.<br /><span>Every Voice.</span>
            </h1>
            <p className="login-hero-desc">
              PRAJA empowers every Indian citizen to raise grievances, track resolutions,
              and connect directly with elected representatives — from Sarpanch to Member of Parliament.
            </p>

            <div className="login-hero-stats" role="list">
              {HERO_STATS.map(s => (
                <div key={s.label} className="login-hero-stat" role="listitem">
                  <span className="stat-num">{s.num}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="login-hero-badges hidden md:flex">
              <span className="login-hero-badge">🔒 Aadhaar Authenticated</span>
              <span className="login-hero-badge">🤖 AI-Powered Routing</span>
              <span className="login-hero-badge">📊 Real-time Analytics</span>
            </div>
          </div>
        </section>

        {/* ── Form panel ── */}
        <section className="login-form-panel" aria-label="Sign in form">
          <div className="portal-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src={prajaLogo} alt="PRAJA Seal" style={{ height: '64px', width: 'auto' }} />
          </div>

          <div className="login-form-panel-header">
            <h2>Secure Sign In</h2>
            <p>Use your Aadhaar number to access your account. Your role is automatically detected.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 24 }}>
            <Input
              label="Aadhaar Number"
              id="aadhaar-input"
              placeholder="XXXX XXXX XXXX"
              value={aadhaar}
              onChange={e => setAadhaar(formatAadhaar(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              autoComplete="username"
              required
              hint="12-digit Aadhaar number — auto-formatted"
            />
            <Input
              label="Password / PRAJA PIN"
              id="password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div
                style={{
                  marginTop: 12, padding: '10px 14px',
                  background: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  borderLeft: '3px solid var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-danger-text)',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                }}
                role="alert"
                aria-live="polite"
              >
                ⚠ {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: 20, letterSpacing: '0.04em' }}
            >
              🔐 Sign In Securely
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="login-demo-section">
            <button
              type="button"
              className="login-demo-toggle"
              onClick={() => setDemoOpen(o => !o)}
              aria-expanded={demoOpen}
              aria-controls="demo-accounts-list"
            >
              <span>📋 Demo Accounts — Testing Only</span>
              <span className={`chevron ${demoOpen ? 'open' : ''}`}>▼</span>
            </button>

            {demoOpen && (
              <div id="demo-accounts-list" className="login-demo-list">
                <div className="login-demo-warning">
                  ⚠ Fictional demo accounts for prototype testing. All Aadhaar numbers are made up.
                </div>
                {DEMO_USERS.map(u => (
                  <button
                    key={u.role}
                    type="button"
                    className="login-demo-btn"
                    onClick={() => quickFill(u)}
                  >
                    <div>
                      <div>
                        <span className="login-demo-btn-role" style={{ color: u.color }}>{u.role}</span>
                        <span className="login-demo-btn-name">· {u.name}</span>
                      </div>
                      <div className="login-demo-btn-meta">
                        <span
                          className="login-demo-btn-level"
                          style={{ background: u.levelBg, color: u.color }}
                        >
                          {u.level}
                        </span>
                        <span className="login-demo-btn-aadhaar">{u.aadhaar}</span>
                      </div>
                    </div>
                    <span className="login-demo-btn-arrow">→</span>
                  </button>
                ))}
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
          <a href="#accessibility">Accessibility</a>
          <a href="#sitemap">Site Map</a>
          <a href="#help">Help</a>
        </div>
        <div>
          © 2026 PRAJA — India Innovates Prototype · Ministry of Electronics &amp; IT, Government of India
          <br />
          <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>Aadhaar numbers shown are entirely fictional.</span>
        </div>
      </footer>
    </div>
  );
}
