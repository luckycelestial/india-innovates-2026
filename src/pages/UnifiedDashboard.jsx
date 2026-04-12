import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import api from '../services/api';
import prajaIcon from '../assets/SS.jpg';
import './UnifiedDashboard.css';
import { FileText, List as ListIcon, Ticket, BarChart3, Map as MapIcon, Bell } from 'lucide-react';

import SubmitTab      from './dashboard/SubmitTab';
import MyComplaintsTab from './dashboard/MyComplaintsTab';
import ManageTicketsTab from './dashboard/ManageTicketsTab';
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
  { id: 'submit',    label: 'Submit Grievance', icon: 'FileText', roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'mine',      label: 'My Complaints', icon: 'ListIcon', roles: ['citizen','sarpanch','district_collector','mla','mp'] },
  { id: 'manage',    label: 'Manage Tickets', icon: 'Ticket', roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', roles: ['sarpanch','district_collector','mla','mp'] },
  { id: 'sentinel',  label: 'Sentinel Pulse', icon: 'MapIcon', roles: ['district_collector','mla','mp'] },
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
  const showAlerts = !['citizen', 'sarpanch'].includes(role);

    const IconMap = {
    FileText: <FileText size={20} />,
    ListIcon: <ListIcon size={20} />,
    Ticket: <Ticket size={20} />,
    BarChart3: <BarChart3 size={20} />,
    MapIcon: <MapIcon size={20} />
  };
  const TABS = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit');

  const selectTab = (id) => {
    setActiveTab(id);
    if (isMobile) setIsSidebarOpen(false); // Auto-close on strictly mobile
  };

  // Load priority alerts silently (must be sentinel *alerts* shape — not *topics* rows)
  useEffect(() => {
    if (!showAlerts) {
      setNotifications([]);
      return;
    }
    const isAlertRow = (item) =>
      item &&
      typeof item === 'object' &&
      (item.type === 'critical_grievance' || item.type === 'sla_breach' || item.type === 'escalated');
    let alive = true;
    supabase.functions.invoke('sentinel', { query: { action: 'alerts' } })
      .then(({ data, error }) => {
        if (error || !alive || !Array.isArray(data)) {
          if (alive) setNotifications([]);
          return;
        }
        const alertsOnly = data.filter(isAlertRow);
        setNotifications(alertsOnly.slice(0, 5));
      })
      .catch(() => {
        if (alive) setNotifications([]);
      });
    return () => {
      alive = false;
    };
  }, [showAlerts]);

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
          <img src={prajaIcon} alt="PRAJA Icon" style={{ height: '36px', width: 'auto', borderRadius: '4px' }} />
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
              <span className='ud-nav-icon'>{IconMap[t.icon]}</span>
              <span className='ud-nav-label'>{t.label}</span>
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
            {showAlerts && (
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
            )}

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
            <div style={{ display: activeTab === 'submit' ? 'block' : 'none' }}>
              <SubmitTab onToast={showToast} />
            </div>
            <div style={{ display: activeTab === 'mine' ? 'block' : 'none' }}>
              <MyComplaintsTab />
            </div>
            {TABS.some(t => t.id === 'manage') && (
              <div style={{ display: activeTab === 'manage' ? 'block' : 'none' }}>
                <ManageTicketsTab onToast={showToast} />
              </div>
            )}
            {TABS.some(t => t.id === 'analytics') && (
              <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
                <AnalyticsTab />
              </div>
            )}
            {TABS.some(t => t.id === 'sentinel') && (
              <div style={{ display: activeTab === 'sentinel' ? 'block' : 'none' }}>
                <SentinelTab />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}



