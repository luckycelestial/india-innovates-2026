import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Settings } from 'lucide-react';
import './Login.css';

const DEMO_USERS = [
  { role: 'CITIZEN', name: 'Ramesh Kumar', aadhaar: '2345 6789 0123', accent: 'citizen' },
  { role: 'SARPANCH', name: 'Lakshmi Devi', aadhaar: '1111 2222 3333', accent: 'sarpanch' },
  { role: 'DISTRICT COLLECTOR', name: 'Vikram Singh', aadhaar: '7890 1234 5678', accent: 'collector' },
  { role: 'MLA', name: 'Arjun Mehta', aadhaar: '9012 3456 7890', accent: 'mla' },
  { role: 'MP', name: 'Rajendra Prasad', aadhaar: '4444 5555 6666', accent: 'mp' },
];

function noopLink(e) {
  e.preventDefault();
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [busyRole, setBusyRole] = useState(null);

  const handleShowcaseSubmit = (e) => {
    e.preventDefault();
  };

  const handleDemoLogin = async (aadhaar) => {
    setBusyRole(aadhaar);
    try {
      await login(aadhaar, 'Demo');
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div className="sov-page">
      <header className="sov-header">
        <div className="sov-header-brand">PRAJA SOVEREIGN</div>
        <nav className="sov-header-nav" aria-label="Primary">
          <a href="#dashboard" className="sov-nav-link active" onClick={noopLink}>
            Dashboard
          </a>
          <a href="#services" className="sov-nav-link" onClick={noopLink}>
            Services
          </a>
          <a href="#schemes" className="sov-nav-link" onClick={noopLink}>
            Schemes
          </a>
          <a href="#about" className="sov-nav-link" onClick={noopLink}>
            About
          </a>
        </nav>
        <div className="sov-header-actions">
          <button type="button" className="sov-icon-btn" aria-label="Notifications (showcase)" onClick={noopLink}>
            <Bell size={20} strokeWidth={2} />
          </button>
          <button type="button" className="sov-icon-btn" aria-label="Settings (showcase)" onClick={noopLink}>
            <Settings size={20} strokeWidth={2} />
          </button>
          <button type="button" className="sov-btn-citizen" onClick={noopLink}>
            Citizen Login
          </button>
        </div>
      </header>

      <section className="sov-hero">
        <div className="sov-hero-chakra" aria-hidden="true" />
        <div className="sov-hero-inner">
          <div className="sov-hero-copy">
            <span className="sov-kicker">Governing public interface</span>
            <h1 className="sov-hero-title">
              <span className="sov-hero-title-navy">Empowering Every</span>{' '}
              <span className="sov-hero-title-white">Citizen&apos;s Voice.</span>
            </h1>
            <p className="sov-hero-lead">
              The official digital bridge for direct grievance redressal, ensuring transparency and accountability in
              governance across the nation.
            </p>
            <div className="sov-hero-metrics">
              <div>
                <strong>98%</strong>
                <span>Success rate</span>
              </div>
              <div>
                <strong>24h</strong>
                <span>Response time</span>
              </div>
            </div>
          </div>

          <div className="sov-portal-card">
            <h2 className="sov-portal-title">Portal access</h2>
            <form className="sov-showcase-form" onSubmit={handleShowcaseSubmit}>
              <label className="sov-label">Aadhaar / digital ID</label>
              <input className="sov-input" type="text" placeholder="XXXX XXXX XXXX" autoComplete="off" readOnly />
              <label className="sov-label">Security password</label>
              <input className="sov-input" type="password" placeholder="••••••••" autoComplete="off" readOnly />
              <div className="sov-form-row">
                <label className="sov-check">
                  <input type="checkbox" disabled tabIndex={-1} /> Stay logged in
                </label>
                <button type="button" className="sov-linkish" onClick={noopLink}>
                  Recovery options
                </button>
              </div>
              <button type="submit" className="sov-btn-primary">
                Authorize &amp; log in
              </button>
              <button type="button" className="sov-btn-secondary" onClick={noopLink}>
                Register new account
              </button>
            </form>

            <div className="sov-demo-block">
              <p className="sov-demo-label">Quick demo access</p>
              <div className="sov-demo-list">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.role}
                    type="button"
                    className={`sov-demo-tile sov-demo-tile--${u.accent}`}
                    disabled={!!busyRole}
                    onClick={() => handleDemoLogin(u.aadhaar)}
                  >
                    <span className="sov-demo-role">{u.role}</span>
                    <span className="sov-demo-name">{u.name}</span>
                    {busyRole === u.aadhaar && <span className="sov-demo-loading">Signing in…</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sov-section sov-section--white" id="services">
        <h2 className="sov-section-title">
          Framework of governance
          <span className="sov-section-underline" />
        </h2>
        <div className="sov-cards-row">
          <article className="sov-feature-card">
            <div className="sov-feature-icon sov-feature-icon--saffron" aria-hidden="true">
              🏛
            </div>
            <h3>Unified redressal</h3>
            <p>One window for filing, tracking, and resolving public grievances with clear accountability.</p>
          </article>
          <article className="sov-feature-card">
            <div className="sov-feature-icon sov-feature-icon--navy" aria-hidden="true">
              🛡
            </div>
            <h3>Secure traceability</h3>
            <p>Every action is logged and auditable so citizens and administrators share a single source of truth.</p>
          </article>
          <article className="sov-feature-card">
            <div className="sov-feature-icon sov-feature-icon--green" aria-hidden="true">
              🌐
            </div>
            <h3>Multi-lingual support</h3>
            <p>Reach citizens in the language they are most comfortable with, across states and districts.</p>
          </article>
        </div>
      </section>

      <section className="sov-section sov-section--muted" id="schemes">
        <h2 className="sov-section-title sov-section-title--center">
          Official assistance channels
          <span className="sov-section-underline sov-section-underline--center" />
        </h2>
        <div className="sov-assist-row">
          <div className="sov-assist-box">
            <span className="sov-assist-label">Toll-free</span>
            <span className="sov-assist-value">1800-11-PRAJA</span>
          </div>
          <div className="sov-assist-box">
            <span className="sov-assist-label">Email desk</span>
            <span className="sov-assist-value">nodal@praja.gov.in</span>
          </div>
          <div className="sov-assist-box">
            <span className="sov-assist-label">Live status</span>
            <button type="button" className="sov-assist-value sov-assist-btn" onClick={noopLink}>
              Check dashboard
            </button>
          </div>
        </div>
      </section>

      <footer className="sov-footer" id="about">
        <div className="sov-footer-links">
          <a href="#privacy" onClick={noopLink}>
            Privacy policy
          </a>
          <a href="#terms" onClick={noopLink}>
            Terms of service
          </a>
          <a href="#accessibility" onClick={noopLink}>
            Accessibility statement
          </a>
          <a href="#contact" onClick={noopLink}>
            Contact us
          </a>
        </div>
        <p className="sov-footer-copy">
          © {new Date().getFullYear()} Government of India. All rights reserved. PRAJA Sovereign is a conceptual
          interface demonstration — managed in spirit by the Department of Administrative Reforms and Public
          Grievances.
        </p>
      </footer>
    </div>
  );
}
