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
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'inherit', opacity: 0.6, padding: '0 4px', lineHeight: 1 }}
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

const ALL_TABS = [
  { id: 'submit',    label: '📝 Submit Grievance', roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'mine',      label: '📋 My Complaints',    roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'manage',    label: '🗂 Manage Tickets',  roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'analytics', label: '📊 Analytics',         roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'nayak',     label: '🤖 NayakAI Assistant',roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'sentinel',  label: '🗺 Sentinel Pulse',    roles: ['district_collector','mla','mp'] },
];

/* ── Root Layout ──────────────────────────────────────────────── */
export default function UnifiedDashboard() {
  const { user, logout } = useAuth();
  const [toast, setToast]     = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,   setShowNotifs]     = useState(false);
  
  // Sidebar State (persisted for desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('praja_sidebar_state');
      // Default to open on larger screens, closed on mobile
      if (stored !== null) return stored === 'true';
      return window.innerWidth > 768;
    }
    return true;
  });

  // Automatically close sidebar on route change if on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(localStorage.getItem('praja_sidebar_state') !== 'false');
      }
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeToast  = useCallback(() => setToast(null), []);
  const showToast   = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      if (!isMobile) localStorage.setItem('praja_sidebar_state', next);
      return next;
    });
  };

  const role      = user?.role || 'citizen';
  const roleLabel = ROLE_LABELS[role] || role;

  const TABS = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit');

  const selectTab = (id) => {
    setActiveTab(id);
    if (isMobile) setIsSidebarOpen(false); // Auto-close on strictly mobile
  };

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
    <div className="ud-layout">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* ── Sidebar ── */}
      <aside className={`ud-sidebar ${isSidebarOpen ? 'open' : ''}`} aria-label="Sidebar Navigation">
        <div className="ud-sidebar-header">
          <img src={prajaIcon} alt="PRAJA Seal" className="ud-logo-icon" />
          <div className="ud-logo-text">
            <div className="ud-logo-name">PRAJA</div>
            <div className="ud-logo-sub">Citizen Portal</div>
          </div>
        </div>

        <nav className="ud-sidebar-nav">
          <div className="ud-nav-group">Menu</div>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ud-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => selectTab(t.id)}
              aria-selected={activeTab === t.id}
            >
              {t.label}
            </button>
          ))}
        </nav>
        
        <div className="ud-sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            Govt. of India Initiative<br />
            &copy; 2026 PRAJA
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isMobile && isSidebarOpen && (
        <div className="ud-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Main Content Area ── */}
      <div className="ud-main-col">
        {/* Tricolor top border strip across whole header area */}
        <div className="ud-tricolor-strip" aria-hidden="true" />
        
        {/* ── Topbar ── */}
        <header className="ud-topbar">
          <div className="ud-topbar-left">
            <button 
              className="ud-menu-toggle" 
              onClick={toggleSidebar}
              aria-label="Toggle Menu"
            >
              ☰
            </button>
            <h1 className="ud-topbar-title">{TABS.find(t => t.id === activeTab)?.label || 'Dashboard'}</h1>
          </div>

          <div className="ud-topbar-right">
            {/* Notification bell */}
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                className="ud-notif-btn"
                onClick={() => setShowNotifs(s => !s)}
                aria-label="Notifications"
                aria-expanded={showNotifs}
              >
                🔔
                {notifications.length > 0 && (
                  <span className="ud-notif-badge">{notifications.length}</span>
                )}
              </button>
              
              {showNotifs && (
                <div className="ud-notif-dropdown">
                  <div className="ud-notif-header">
                    <span>Priority Alerts</span>
                    <span className="ud-notif-count">{notifications.length}</span>
                  </div>
                  <div className="ud-notif-body">
                    {notifications.length === 0 ? (
                      <div className="ud-notif-empty">No active alerts</div>
                    ) : notifications.map((n, i) => (
                      <div key={i} className={`ud-notif-item ${n.severity === 'critical' ? 'critical' : 'warning'}`}>
                        <div className="title">{n.title || 'Alert'}</div>
                        <div className="desc">{n.description || 'Action required immediately.'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="ud-topbar-divider" />

            {/* User info */}
            <div className="ud-user-info hidden sm:block">
              <div className="name">{user?.name || 'User'}</div>
              <div className="role">{roleLabel}</div>
            </div>

            {/* Sign out */}
            <button className="ud-signout-btn" onClick={logout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Content Body ── */}
        <main className="ud-content-body">
          <div className="ud-content-container">
            {activeTab === 'submit'    && <SubmitTab onToast={showToast} />}
            {activeTab === 'mine'      && <MyComplaintsTab />}
            {activeTab === 'manage'    && <ManageTicketsTab onToast={showToast} />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'nayak'     && <NayakAITab />}
            {activeTab === 'sentinel'  && <SentinelTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
