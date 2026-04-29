import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../services/supabase';
import { listGrievances, runEscalationUpdate } from '../../services/grievancesApi';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', escalated: 'Escalated', closed: 'Closed',
};
const CHART_COLORS = ['#06038D', '#FF9933', '#138808', '#0284C7', '#D97706', '#dc2626', '#eab308'];

const STAT_ITEMS = [
  { key: 'open',        label: 'Open',        color: 'var(--color-warning)' },
  { key: 'in_progress', label: 'In Progress',  color: 'var(--color-info)' },
  { key: 'resolved',    label: 'Resolved',     color: 'var(--color-success)' },
  { key: 'escalated',   label: 'Escalated',    color: 'var(--color-danger)' },
  { key: '__total__',   label: 'Total',        color: 'var(--text-primary)' },
];

export default function ManageTicketsTab({ onToast }) {
  const { user } = useAuth();
  const [statusFilter, setFilter] = useState('');
  const [showPerf, setShowPerf] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [rawTickets, setRawTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const reloadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGrievances(user, {
        statusFilter,
        limit: 100,
      });
      setRawTickets(data || []);
    } catch (err) {
      onToast(`Failed to load tickets: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onToast, user]);

  const tickets = useMemo(() => {
    const list = Array.isArray(rawTickets) ? [...rawTickets] : [];
    return list.sort((a, b) => {
      const aStr = a?.created_at || '';
      const bStr = b?.created_at || '';
      if (aStr < bStr) return 1;
      if (aStr > bStr) return -1;
      return 0;
    });
  }, [rawTickets]);

  const [perf, setPerf] = useState(null);
  const [escalating, setEscalating] = useState(false);

  const loadPerf = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke('dev-dummy-endpoint/performance');
      setPerf(res.data);
    } catch(err) {}
  }, []);

  const checkEscalationAuto = async () => {
    setEscalating(true);
    let count = 0;
    try {
      const rows = await runEscalationUpdate(user);
      count = rows?.length || 0;
    } catch(err) {
      console.log(err);
    } finally {
      setEscalating(false);
    }
    return { escalated_count: count };
  };

  useEffect(() => { reloadTickets(); }, [statusFilter, reloadTickets]);

  const runAutoEscalation = async () => {
    try {
      const data = await checkEscalationAuto();
      onToast(`🔺 Auto-escalated ${data?.escalated_count || 0} ticket(s)`, data?.escalated_count > 0 ? 'warning' : 'success');
      reloadTickets();
    } catch (err) {
      onToast(`Escalation check failed: ${err.message}`, 'error');
    }
  };

  const handleLoadPerformance = () => {
    if (!showPerf && !perf) loadPerf();
    setShowPerf(!showPerf);
  };

  // PERFORMANCE: Memoize counts to avoid expensive O(N) array reduction
  // on every component render (e.g. when toggling details or stats).
  const counts = useMemo(() => tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {}), [tickets]);

  const getCount = (key) => key === '__total__' ? tickets.length : (counts[key] || 0);

  const formatComplaintDate = (isoDate) => {
    if (!isoDate) return null;
    const dt = new Date(isoDate);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatGroupDate = (isoDate) => {
    if (!isoDate) return 'Unknown Date';
    const dt = new Date(isoDate);
    if (Number.isNaN(dt.getTime())) return 'Unknown Date';
    return dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const groupedTickets = useMemo(() => {
    const groups = [];
    let currentKey = null;

    for (const ticket of tickets) {
      const rawDate = ticket?.created_at;
      const key = (rawDate && rawDate.length >= 10)
        ? rawDate.slice(0, 10)
        : 'unknown-date';

      if (key !== currentKey) {
        groups.push({
          key,
          label: formatGroupDate(ticket?.created_at),
          items: [ticket],
        });
        currentKey = key;
      } else {
        groups[groups.length - 1].items.push(ticket);
      }
    }

    return groups;
  }, [tickets]);

  const detectComplaintLanguage = (text) => {
    const value = String(text || '').trim();
    if (!value) return 'Not available';

    if (/[\u0B80-\u0BFF]/.test(value)) return 'Tamil';
    if (/[\u0C00-\u0C7F]/.test(value)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(value)) return 'Hindi';
    if (/[\u0D00-\u0D7F]/.test(value)) return 'Malayalam';
    if (/[\u0A80-\u0AFF]/.test(value)) return 'Gujarati';
    if (/[\u0A00-\u0A7F]/.test(value)) return 'Punjabi';
    if (/[\u0980-\u09FF]/.test(value)) return 'Bengali';
    if (/[\u0C80-\u0CFF]/.test(value)) return 'Kannada';
    if (/[a-zA-Z]/.test(value)) return 'English';

    return 'Unknown';
  };

  const closeDetails = () => setSelectedTicket(null);

  return (
    <div>
      {/* Header */}
      <div className="ud-manage-header">
        <div>
          <p className="ud-title">Manage Tickets</p>
          <p className="ud-subtitle" style={{ marginBottom: 0 }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {statusFilter ? `Filter: ${STATUS_LABEL[statusFilter]}` : 'All statuses'}
          </p>
        </div>
        <div className="ud-manage-actions">
          <Button variant="secondary" size="sm" onClick={runAutoEscalation} isLoading={escalating}>
            🔺 Auto-Escalate
          </Button>
          <Button variant="secondary" size="sm" onClick={handleLoadPerformance}>
            {showPerf ? '📊 Hide Stats' : '📊 Dept. Stats'}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {STAT_ITEMS.map(({ key, label, color }) => {
          const count = getCount(key);
          const isActive = statusFilter === key;
          const isTotal = key === "__total__";
          return (
            <div
              key={key}
              onClick={() => !isTotal && setFilter(f => f === key ? "" : key)}
              style={{
                cursor: !isTotal ? "pointer" : "default",
                background: "var(--bg-surface)",
                border: "1px solid",
                borderColor: isActive ? "var(--color-primary)" : "var(--border-color)",
                borderTop: `4px solid ${color}`,
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: isActive ? "0 0 0 2px var(--color-primary-glow)" : "0 2px 4px rgba(0,0,0,0.02)",
                opacity: (statusFilter && !isActive && !isTotal) ? 0.6 : 1,
                transition: "all 0.2s ease"
              }}
              role={!isTotal ? "button" : undefined}
              aria-pressed={isActive}
            >
              <div style={{ color: color, fontSize: "1.8rem", fontWeight: 900, lineHeight: 1, marginBottom: "8px" }}>
                {count}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance section */}
      {showPerf && perf && (
        <div className="ud-perf-section">
          <div className="ud-chart-title">Department Performance</div>
          <div className="ud-stats-row" style={{ marginBottom: perf.category_breakdown?.length ? 16 : 0 }}>
            <div className="ud-stat-card"><div className="ud-stat-num total">{perf.total_grievances || 0}</div><div className="ud-stat-label">Total</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num open">{perf.total_open || 0}</div><div className="ud-stat-label">Open</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num resolved">{perf.total_resolved || 0}</div><div className="ud-stat-label">Resolved</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num escalated">{perf.total_escalated || 0}</div><div className="ud-stat-label">Escalated</div></div>
          </div>
          {perf.category_breakdown?.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perf.category_breakdown} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-color-hover)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
                <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                  {perf.category_breakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="resolved" name="Resolved" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <p className="ud-loading" />
      ) : tickets.length === 0 ? (
        <Card>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              {statusFilter ? `No ${STATUS_LABEL[statusFilter]} tickets` : 'No tickets found'}
            </div>
          </div>
        </Card>
      ) : (
        <div className="ud-ticket-list">
          {groupedTickets.map(group => (
            <div key={group.key} className="ud-ticket-group">
              <div className="ud-ticket-group-date">{group.label}</div>
              <Card className="ud-ticket-day-card">
                <div className="ud-ticket-group-list">
                  {group.items.map((t, idx) => (
                    <div key={t.id} className="ud-ticket-row">
                      <div className="ud-ticket-inline-row">
                        <div className="ud-ticket-inline-main">
                          <span className="ud-ticket-order">{idx + 1}.</span>
                          <div className="ud-ticket-title ud-ticket-title-inline">{t.title || '—'}</div>
                        </div>
                        <div className="ud-ticket-col ud-ticket-col-dept">
                          <span className="ud-ticket-inline-chip">📂 {t.ai_category || 'General'}</span>
                        </div>
                        <div className="ud-ticket-col ud-ticket-col-priority">
                          <span className={`ud-pri-${t.priority || 'medium'}`}>{(t.priority || 'medium').toUpperCase()}</span>
                        </div>
                        <button
                          type="button"
                          className="ud-full-details-btn"
                          onClick={() => setSelectedTicket(t)}
                        >
                          Full Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {selectedTicket && (
        <div className="ud-ticket-detail-overlay" onClick={closeDetails}>
          <div className="ud-ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ud-ticket-detail-header">
              <div>
                <div className="ud-ticket-detail-title">{selectedTicket.title || 'Complaint Details'}</div>
                <div className="ud-ticket-detail-subtitle">Tracking ID {selectedTicket.tracking_id || '—'}</div>
              </div>
              <button className="ud-ticket-detail-close" onClick={closeDetails} aria-label="Close details">×</button>
            </div>

            <div className="ud-ticket-detail-grid">
              <div className="ud-ticket-detail-item"><span>Language</span><strong>{selectedTicket.language || detectComplaintLanguage(selectedTicket.description)}</strong></div>
              <div className="ud-ticket-detail-item"><span>Category</span><strong>{selectedTicket.ai_category || 'General'}</strong></div>
              <div className="ud-ticket-detail-item"><span>Priority</span><strong>{(selectedTicket.priority || 'medium').toUpperCase()}</strong></div>
              <div className="ud-ticket-detail-item"><span>Status</span><strong>{STATUS_LABEL[selectedTicket.status] || selectedTicket.status || 'Open'}</strong></div>
              <div className="ud-ticket-detail-item"><span>User Location</span><strong>{selectedTicket.user_location_text || 'Not provided'}</strong></div>
              <div className="ud-ticket-detail-item"><span>Verification</span>
                <strong style={{ 
                  color: selectedTicket.location_verification_status === 'verified' ? 'var(--color-success-text)' : 
                         selectedTicket.location_verification_status === 'mismatch' ? 'var(--color-danger-text)' : 'inherit' 
                }}>
                  {selectedTicket.location_verification_status ? selectedTicket.location_verification_status.toUpperCase() : 'PENDING'}
                </strong>
              </div>
              <div className="ud-ticket-detail-item"><span>GPS Data</span><strong>{selectedTicket.gps_latitude ? `${selectedTicket.gps_latitude.toFixed(4)}, ${selectedTicket.gps_longitude.toFixed(4)}` : 'No GPS info'}</strong></div>
              <div className="ud-ticket-detail-item"><span>Created Time</span><strong>{formatComplaintDate(selectedTicket.created_at) || '—'}</strong></div>
              <div className="ud-ticket-detail-item"><span>Updated Time</span><strong>{formatComplaintDate(selectedTicket.updated_at) || '—'}</strong></div>
              <div className="ud-ticket-detail-item"><span>Location</span><strong>{selectedTicket.location || selectedTicket.ward || 'Not provided'}</strong></div>
              <div className="ud-ticket-detail-item"><span>SLA Deadline</span><strong>{formatComplaintDate(selectedTicket.sla_deadline) || '—'}</strong></div>
            </div>

            <div className="ud-ticket-detail-block">
              <div className="ud-ticket-detail-label">Complaint Text</div>
              <div className="ud-ticket-detail-text">{selectedTicket.description || 'No complaint description provided.'}</div>
            </div>

            {selectedTicket.photo_url && (
              <div className="ud-ticket-detail-block">
                <div className="ud-ticket-detail-label">Submitted Photo</div>
                <img src={selectedTicket.photo_url} alt="Complaint evidence" className="ud-ticket-detail-photo" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
