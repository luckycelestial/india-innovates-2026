import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prajaIcon from '../assets/praja-logo-icon.svg';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Login.css';

/**
 * @typedef {Object} DemoUser
 * @property {string} role - The user's role (e.g., 'Citizen', 'Sarpanch')
 * @property {string} level - The governance level ('Public', 'Local', etc.)
 * @property {string} aadhaar - Mock Aadhaar number
 * @property {string} password - Mock password
 * @property {string} name - Mock user name
 * @property {string} color - Role theme color
 * @property {string} levelBg - Role theme background color
 */

/** @type {DemoUser[]} */
const DEMO_USERS = [
  { role: 'Citizen',           level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo1234', name: 'Ramesh Kumar',    color: '#FF6600', levelBg: '#fff3eb' },
  { role: 'Sarpanch',          level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo1234', name: 'Lakshmi Devi',    color: '#006400', levelBg: '#f0faf0' },
  { role: 'District Collector', level: 'District', aadhaar: '7890 1234 5678', password: 'Demo1234', name: 'Vikram Singh',    color: '#003087', levelBg: '#f0f4ff' },
  { role: 'MLA',               level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo1234', name: 'Arjun Mehta',     color: '#7c3aed', levelBg: '#f5f0ff' },
  { role: 'MP',                level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo1234', name: 'Rajendra Prasad', color: '#b45309', levelBg: '#fffbeb' },
];

const HERO_STATS = [
  { num: '12,470+', label: 'Grievances Filed' },
  { num: '89%',     label: 'Resolution Rate' },
  { num: '5',       label: 'Districts Covered' },
];

/**
 * Formats an Aadhaar number to add spaces every 4 digits.
 * @param {string} val - Raw input value
 * @returns {string} Formatted Aadhaar string (e.g. "1234 5678 9012")
 */
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

  /**
   * Handles the login form submission.
   * @param {React.FormEvent} e 
   */
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

  /**
   * Fills the form with a demo user's credentials.
   * @param {DemoUser} u 
   */
  const quickFill = (u) => { 
    setAadhaar(u.aadhaar); 
    setPassword(u.password); 
    setError(''); 
  };

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
        <div className="login-goi-right hidden sm:flex">
          <span className="tricolor-flag mr-2">🇮🇳</span>
          <div className="tagline">प्रजा · प्रजातंत्र · प्रगति</div>
        </div>
      </header>

      {/* Nav strip */}
      <nav className="login-nav-strip overflow-x-auto whitespace-nowrap" aria-label="Portal navigation">
        <a href="#about">About PRAJA</a>
        <a href="#help">Help & Support</a>
        <a href="#sitemap">Site Map</a>
        <a href="#accessibility">Accessibility</a>
        <a href="#login" className="active">Citizen Login</a>
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

          <div className="login-hero-badges flex-wrap gap-2 hidden md:flex">
            <span className="login-hero-badge">🔒 Aadhaar Authenticated</span>
            <span className="login-hero-badge">🤖 AI-Powered Routing</span>
            <span className="login-hero-badge">📊 Real-time Analytics</span>
          </div>
        </section>

        {/* Right form panel */}
        <section className="login-form-panel" aria-label="Sign in form">
          <div className="login-form-panel-header">
            <div className="portal-logo mb-6">
              <img src={prajaIcon} alt="PRAJA Seal" className="portal-logo-icon" style={{ width: 48, height: 48, objectFit: 'contain' }} />
              <div className="portal-logo-text">
                <div className="name text-2xl font-bold tracking-tight">PRAJA</div>
                <div className="sub text-xs text-blue-600 font-medium tracking-wide">Citizen Platform</div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Secure Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">Use your Aadhaar number to access your account. Your role is automatically detected.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mb-6 border-b border-gray-100 pb-8">
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
              hint="12-digit Aadhaar number (auto-formatted)"
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
              className="mt-4"
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border-l-4 border-red-500 font-medium" role="alert" aria-live="polite">
                ⚠ {error}
              </div>
            )}

            <Button type="submit" isLoading={loading} className="w-full mt-6 h-12 text-base font-bold shadow-md shadow-orange-500/20">
              <span className="mr-2">🔐</span> Sign In Securely
            </Button>
          </form>

          {/* Demo Accounts Wrapper */}
          <div className="login-demo-section">
            <button
              className="w-full py-3 flex items-center justify-between text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg px-4 transition-colors"
              onClick={() => setDemoOpen(o => !o)}
              aria-expanded={demoOpen}
              aria-controls="demo-accounts-list"
              type="button"
            >
              <span>📋 Demo Accounts (Testing Only)</span>
              <span className={`transform transition-transform ${demoOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {demoOpen && (
              <div id="demo-accounts-list" className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded mb-4 font-medium border border-orange-100">
                  ⚠ These are fictional demo accounts for prototype testing. All Aadhaar numbers are made up.
                </div>
                <div className="flex flex-col gap-2">
                  {DEMO_USERS.map(u => (
                    <button 
                      key={u.role} 
                      onClick={() => quickFill(u)} 
                      className="text-left w-full p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors flex justify-between items-center group focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="button"
                    >
                      <div>
                        <div className="mb-1">
                          <span className="font-bold text-sm" style={{ color: u.color }}>{u.role}</span>
                          <span className="text-sm text-gray-600 font-medium ml-1">· {u.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: u.levelBg, color: u.color }}>
                            {u.level}
                          </span>
                          <span className="text-xs text-gray-500 font-mono tracking-wider">{u.aadhaar}</span>
                        </div>
                      </div>
                      <span className="text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all">→</span>
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
        <div className="login-footer-links flex-wrap justify-center gap-4 hidden sm:flex">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Use</a>
          <a href="#accessibility">Accessibility Statement</a>
          <a href="#sitemap">Site Map</a>
          <a href="#help">Help</a>
        </div>
        <div className="text-center mt-2 opacity-80 text-xs sm:text-sm">
          © 2026 PRAJA — India Innovates Prototype &nbsp;<span className="hidden sm:inline">·</span><br className="sm:hidden" />&nbsp; Ministry of Electronics &amp; IT, Government of India
          <br /><span className="opacity-60 text-xs">Aadhaar numbers shown are entirely fictional.</span>
        </div>
      </footer>
    </div>
  );
}
