import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { Card, Badge } from '../../components/ui/Card';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', escalated: 'Escalated', closed: 'Closed',
};
const CHART_COLORS = ['#ff6b00','#f59e0b','#22c55e','#ef4444','#8b5cf6','#38bdf8','#f97316','#84cc16','#ec4899'];

const STAT_ITEMS = [
  { key: 'open',        label: 'Open',        color: 'var(--color-warning)' },
  { key: 'in_progress', label: 'In Progress',  color: 'var(--color-info)' },
  { key: 'resolved',    label: 'Resolved',     color: 'var(--color-success)' },
  { key: 'escalated',   label: 'Escalated',    color: 'var(--color-danger)' },
  { key: '__total__',   label: 'Total',        color: 'var(--text-primary)' },
];

export default function ManageTicketsTab({ onToast }) {
  const [statusFilter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [showPerf, setShowPerf] = useState(false);

  const { data: rawTickets, loading, execute: reloadTickets } =
    useFetch(`/officers/tickets${statusFilter ? `?status=${statusFilter}&limit=100` : '?limit=100'}`);
  const tickets = rawTickets || [];

  const { data: perf, execute: loadPerf } = useFetch('/officers/performance', {}, false);
  const { mutate: checkEscalation, loading: escalating } = useMutation('post');
  const { mutate: updateTicketStatus } = useMutation('put');

  useEffect(() => { reloadTickets(); }, [statusFilter, reloadTickets]);

  const handleUpdateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await updateTicketStatus(`/grievances/${id}/status?status=${status}`);
      reloadTickets();
      onToast('Status updated', 'success');
    } catch (err) {
      onToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const runAutoEscalation = async () => {
    try {
      const data = await checkEscalation('/grievances/check-escalation');
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

  const counts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const getCount = (key) => key === '__total__' ? tickets.length : (counts[key] || 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <p className="ud-title">Manage Tickets</p>
          <p className="ud-subtitle" style={{ marginBottom: 0 }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · {statusFilter ? `Filter: ${STATUS_LABEL[statusFilter]}` : 'All statuses'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={runAutoEscalation} isLoading={escalating}>
            🔺 Auto-Escalate
          </Button>
          <Button variant="secondary" size="sm" onClick={handleLoadPerformance}>
            {showPerf ? '📊 Hide Stats' : '📊 Dept. Stats'}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="ud-stats-row">
        {STAT_ITEMS.map(({ key, label, color }) => {
          const count = getCount(key);
          const isActive = statusFilter === key;
          return (
            <div
              key={key}
              className="ud-stat-card"
              style={{
                cursor: key !== '__total__' ? 'pointer' : 'default',
                borderColor: isActive ? 'var(--color-primary)' : undefined,
                boxShadow: isActive ? '0 0 0 2px var(--color-primary-glow)' : undefined,
              }}
              onClick={() => key !== '__total__' && setFilter(f => f === key ? '' : key)}
              role={key !== '__total__' ? 'button' : undefined}
              aria-pressed={isActive}
            >
              <div className="ud-stat-num" style={{ color }}>{count}</div>
              <div className="ud-stat-label">{label}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map(t => (
            <Card key={t.id}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Left: info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{t.title || '—'}</div>
                  <div className="ud-ticket-meta">
                    {t.tracking_id && <span className="ud-tracking-id">{t.tracking_id}</span>}
                    {t.ai_category && <span>📂 {t.ai_category}</span>}
                    {t.priority && <span className={`ud-pri-${t.priority}`}>{t.priority.toUpperCase()}</span>}
                    {t.escalation_level > 0 && (
                      <span style={{ color: 'var(--color-danger-text)', fontWeight: 700 }}>🔺 L{t.escalation_level}</span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {String(t.description).slice(0, 120)}{String(t.description).length > 120 ? '…' : ''}
                    </div>
                  )}
                </div>
                {/* Right: status select */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <select
                    className="ud-status-select"
                    value={t.status || 'open'}
                    onChange={e => handleUpdateStatus(t.id, e.target.value)}
                    disabled={updating === t.id}
                    aria-label={`Status for ticket ${t.tracking_id}`}
                  >
                    {['open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(s => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
