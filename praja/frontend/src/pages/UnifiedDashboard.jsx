import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import prajaIcon from '../assets/praja-logo-icon.svg';
import './UnifiedDashboard.css';

// Extracted Tab Components
import SubmitTab from './dashboard/SubmitTab';
import MyComplaintsTab from './dashboard/MyComplaintsTab';
import ManageTicketsTab from './dashboard/ManageTicketsTab';
import NayakAITab from './dashboard/NayakAITab';
import SentinelTab from './dashboard/SentinelTab';
import AnalyticsTab from '../components/AnalyticsTab';

// ─── Toast ──────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`ud-toast ${type === 'error' ? 'ud-toast-error' : 'ud-toast-success'}`} role="alert" aria-live="assertive">
      <span className="flex-1">{message}</span>
      <button className="text-xl ml-4 opacity-70 hover:opacity-100 focus:outline-none" onClick={onClose} aria-label="Close">×</button>
    </div>
  );
}

// ─── Root Layout ─────────────────────────────────────────
export default function UnifiedDashboard() {
  const { user, logout } = useAuth();
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const role = user?.role || 'citizen';

  // Load priority notifications minimally
  useEffect(() => {
    let alive = true;
    api.get('/sentinel/alerts')
      .then(r => {
        if (alive && Array.isArray(r.data)) setNotifications(r.data.slice(0, 5));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const TABS = [
    { id: 'submit',   label: '📝 Submit',         roles: ['citizen','sarpanch','district_collector','mla','mp'] },
    { id: 'mine',     label: '📋 My Complaints',  roles: ['citizen','sarpanch','district_collector','mla','mp'] },
    { id: 'manage',   label: '🗂️ Manage Tickets', roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'analytics',label: '📊 Analytics',      roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'nayak',    label: '🤖 NayakAI',        roles: ['sarpanch','district_collector','mla','mp'] },
    { id: 'sentinel', label: '🗺️ Sentinel',        roles: ['district_collector','mla','mp'] },
  ].filter(t => t.roles.includes(role));

  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'submit');

  const roleLabel = {
    citizen: 'Citizen',
    sarpanch: 'Sarpanch',
    district_collector: 'District Collector',
    mla: 'MLA',
    mp: 'Member of Parliament',
    officer: 'Officer',
    leader: 'Leader',
  }[role] || role;

  return (
    <div className="ud-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Tricolor decorative strip */}
      <div style={{ height: 4, background: 'linear-gradient(to right, #FF9933 33.3%, #fff 33.3%, #fff 66.6%, #138808 66.6%)' }} />

      <header className="ud-topbar">
        <div className="ud-logo">
          <img src={prajaIcon} alt="PRAJA Seal" className="ud-logo-icon" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div>
            <div className="ud-logo-name text-2xl font-bold tracking-tight text-white">PRAJA</div>
            <div className="ud-logo-sub text-xs text-orange-200">Citizen Grievance Platform</div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <button 
              className="ud-notif-btn relative text-xl p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              onClick={() => setShowNotifs(!showNotifs)}
              aria-label="Notifications"
              aria-expanded={showNotifs}
            >
              🔔
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border border-[var(--bg-surface)]">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800 flex justify-between">
                  <span>Priority Alerts</span>
                  <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 rounded-full leading-relaxed">{notifications.length}</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No active alerts</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-default ${n.severity === 'critical' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500'}`}>
                        <div className="font-bold text-sm text-gray-800 mb-1">{n.title || 'Alert'}</div>
                        <div className="text-xs text-gray-600 line-clamp-2">{n.description || 'Action required immediately.'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-white">Hello, {user?.name || 'User'}</div>
            <div className={`text-xs font-bold uppercase tracking-wider ${
              role === 'citizen' ? 'text-blue-300' : role === 'sarpanch' ? 'text-green-300' : 'text-orange-300'
            }`}>
              {roleLabel}
            </div>
          </div>
          
          <button 
            className="text-sm font-medium text-gray-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors focus:ring-2 focus:ring-white border border-white/20"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </header>

      <nav className="ud-tabnav flex overflow-x-auto bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`
              relative px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none
              ${activeTab === t.id ? 'text-orange-500 bg-white/5' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}
            `}
            onClick={() => setActiveTab(t.id)}
            aria-selected={activeTab === t.id}
          >
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
            )}
          </button>
        ))}
      </nav>

      <main className="ud-content relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {activeTab === 'submit'    && <SubmitTab onToast={(msg, type) => setToast({ message: msg, type })} />}
          {activeTab === 'mine'      && <MyComplaintsTab />}
          {activeTab === 'manage'    && <ManageTicketsTab onToast={(msg, type) => setToast({ message: msg, type })} />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'nayak'     && <NayakAITab />}
          {activeTab === 'sentinel'  && <SentinelTab />}
        </div>
      </main>
    </div>
  );
}
