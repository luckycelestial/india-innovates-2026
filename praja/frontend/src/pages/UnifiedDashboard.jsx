import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import prajaIcon from '../assets/praja-logo-icon.svg';
import './UnifiedDashboard.css';

import SubmitTab      from './dashboard/SubmitTab';
import MyComplaintsTab from './dashboard/MyComplaintsTab';
import ManageTicketsTab from './dashboard/ManageTicketsTab';
import NayakAITab     from './dashboard/NayakAITab';
import SentinelTab    from './dashboard/SentinelTab';
import AnalyticsTab   from '../components/AnalyticsTab';

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`ud-toast ud-toast-${type}`} role="alert" aria-live="assertive">
      <span style={{ flex: 1 }}>{message}</span>
      <button
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit', opacity: 0.6, padding: '0 4px' }}
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

/* ── Role config ──────────────────────────────────────────────── */
const ROLE_LABELS = {
  citizen:            'Citizen',
  sarpanch:           'Sarpanch',
  district_collector: 'District Collector',
  mla:                'MLA',
  mp:                 'Member of Parliament',
  officer:            'Officer',
  leader:             'Leader',
};

const ROLE_COLORS = {
  citizen:            'var(--color-info-text)',
  sarpanch:           'var(--color-success-text)',
  district_collector: 'var(--color-primary-light)',
  mla:                '#c4b5fd',
  mp:                 'var(--color-accent)',
};

const ALL_TABS = [
  { id: 'submit',    label: '📝 Submit',          roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'mine',      label: '📋 My Complaints',   roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'manage',    label: '🗂 Manage',           roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'analytics', label: '📊 Analytics',        roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'nayak',     label: '🤖 NayakAI',          roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'sentinel',  label: '🗺 Sentinel',          roles: ['district_collector','mla','mp'] },
];

/* ── Root Layout ──────────────────────────────────────────────── */
export default function UnifiedDashboard() {
  const { user, logout } = useAuth();
  const [toast, setToast]     = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,   setShowNotifs]     = useState(false);

  const closeToast  = useCallback(() => setToast(null), []);
  const showToast   = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const role      = user?.role || 'citizen';
  const roleLabel = ROLE_LABELS[role] || role;
  const roleColor = ROLE_COLORS[role] || 'var(--text-secondary)';

  const TABS = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit');

  // Load priority alerts silently
  useEffect(() => {
    let alive = true;
    api.get('/sentinel/alerts')
      .then(r => { if (alive && Array.isArray(r.data)) setNotifications(r.data.slice(0, 5)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Close notification popover when clicking outside
  useEffect(() => {
    if (!showNotifs) return;
    const handler = () => setShowNotifs(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showNotifs]);

  return (
    <div className="ud-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Tricolor strip */}
      <div style={{ height: 3, background: 'var(--tricolor-gradient)', flexShrink: 0 }} aria-hidden="true" />

      {/* ── Topbar ── */}
      <header className="ud-topbar">
        <div className="ud-logo">
          <img src={prajaIcon} alt="PRAJA Seal" className="ud-logo-icon" />
          <div>
            <div className="ud-logo-name">PRAJA</div>
            <div className="ud-logo-sub">Citizen Platform</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Notification bell */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.25rem', position: 'relative', color: 'var(--text-secondary)',
                padding: '6px', borderRadius: 'var(--radius-full)',
                transition: 'background var(--transition-fast)',
              }}
              onClick={() => setShowNotifs(s => !s)}
              aria-label="Notifications"
              aria-expanded={showNotifs}
              className="hover:bg-white/10"
            >
              🔔
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--color-danger)',
                  color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-surface)',
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div style={{
                position: 'absolute', right: 0, top: 44,
                width: 320, background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-color-hover)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontWeight: 700, fontSize: '0.875rem',
                }}>
                  <span>Priority Alerts</span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 600,
                    background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)',
                    border: '1px solid var(--color-danger-border)',
                    padding: '1px 8px', borderRadius: 'var(--radius-full)',
                  }}>{notifications.length}</span>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No active alerts
                    </div>
                  ) : notifications.map((n, i) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${n.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: 3 }}>{n.title || 'Alert'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {n.description || 'Action required immediately.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="hidden sm:block" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
              {roleLabel}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={logout}
            style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-color-hover)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all var(--transition-fast)',
              letterSpacing: '0.02em',
            }}
            className="hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Tab Nav ── */}
      <nav className="ud-tabnav" aria-label="Dashboard sections">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ud-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            aria-selected={activeTab === t.id}
            role="tab"
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="ud-content" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {activeTab === 'submit'    && <SubmitTab onToast={showToast} />}
          {activeTab === 'mine'      && <MyComplaintsTab />}
          {activeTab === 'manage'    && <ManageTicketsTab onToast={showToast} />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'nayak'     && <NayakAITab />}
          {activeTab === 'sentinel'  && <SentinelTab />}
        </div>
      </main>
    </div>
  );
}
