import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { Card, Badge } from '../../components/ui/Card';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', escalated: 'Escalated', closed: 'Closed',
};
const CHART_COLORS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

export default function ManageTicketsTab({ onToast }) {
  const [statusFilter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  
  const { data: rawTickets, loading, execute: reloadTickets } = useFetch(`/officers/tickets${statusFilter ? `?status=${statusFilter}&limit=100` : '?limit=100'}`);
  const tickets = rawTickets || [];

  const [showPerf, setShowPerf] = useState(false);
  const { data: perf, execute: loadPerf } = useFetch('/officers/performance', {}, false);
  const { mutate: checkEscalation, loading: escalating } = useMutation('post');
  const { mutate: updateTicketStatus } = useMutation('put');

  useEffect(() => {
    reloadTickets();
  }, [statusFilter, reloadTickets]);

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

  const STAT_ITEMS = [
    { key: 'open',        label: 'Open' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved',    label: 'Resolved' },
    { key: 'escalated',   label: 'Escalated' },
  ];

  return (
    <div>
      <p className="ud-title">Manage Tickets</p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Button variant="secondary" onClick={runAutoEscalation} isLoading={escalating}>
          🔺 Run Auto-Escalation
        </Button>
        <Button variant="secondary" onClick={handleLoadPerformance}>
          {showPerf ? '📊 Hide Stats' : '📊 Department Performance'}
        </Button>
      </div>

      {showPerf && perf && (
        <div className="ud-perf-section mb-6">
          <div className="ud-stats-row">
            <div className="ud-stat-card"><div className="ud-stat-num total">{perf.total_grievances || 0}</div><div className="ud-stat-label">Total</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num open">{perf.total_open || 0}</div><div className="ud-stat-label">Open</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num resolved">{perf.total_resolved || 0}</div><div className="ud-stat-label">Resolved</div></div>
            <div className="ud-stat-card"><div className="ud-stat-num escalated">{perf.total_escalated || 0}</div><div className="ud-stat-label">Escalated</div></div>
          </div>
          {perf.category_breakdown?.length > 0 && (
            <div className="ud-chart-container mt-4">
              <p className="ud-chart-title">Category Breakdown</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perf.category_breakdown} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{fill:'#475569',fontSize:11}} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{fill:'#475569',fontSize:11}} />
                  <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:8}} />
                  <Bar dataKey="total" name="Total" radius={[4,4,0,0]}>
                    {perf.category_breakdown.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="ud-stats-row mb-6">
        {STAT_ITEMS.map(({ key, label }) => (
          <div
            key={key}
            className={`ud-stat-card cursor-pointer ${statusFilter === key ? `border-orange-500 shadow-md` : ''}`}
            onClick={() => setFilter(f => f === key ? '' : key)}
          >
            <div className={`ud-stat-num ${key}`}>{counts[key] || 0}</div>
            <div className="ud-stat-label">{label}</div>
          </div>
        ))}
        <div className="ud-stat-card cursor-pointer" onClick={() => setFilter('')}>
          <div className="ud-stat-num total">{tickets.length}</div>
          <div className="ud-stat-label">total</div>
        </div>
      </div>

      {loading ? (
        <p className="ud-loading">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="ud-alert-empty">No tickets found for this filter</div>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map(t => (
            <Card key={t.id} className="flex flex-col md:flex-row gap-4 justify-between">
               <div style={{ flex: 1 }}>
                  <div className="font-semibold text-lg">{t.title || '—'}</div>
                  <div className="flex gap-3 text-sm text-gray-500 mt-2">
                    <span className="font-mono">{t.tracking_id || '—'}</span>
                    {t.ai_category && <span>{t.ai_category}</span>}
                    {t.priority && (
                      <span className={`ud-pri-${t.priority} font-bold`}>{t.priority.toUpperCase()}</span>
                    )}
                    {t.escalation_level > 0 && (
                      <span className="text-red-600 font-bold">🔺 L{t.escalation_level}</span>
                    )}
                  </div>
                  {t.description && (
                    <div className="mt-3 text-sm text-gray-700">
                      {String(t.description).slice(0, 100)}{String(t.description).length > 100 ? '…' : ''}
                    </div>
                  )}
               </div>
               <div>
                  <select
                    className="ud-status-select p-2 border border-gray-300 rounded-md focus:border-orange-500 outline-none"
                    value={t.status || 'open'}
                    style={{ minWidth: 140 }}
                    onChange={e => handleUpdateStatus(t.id, e.target.value)}
                    disabled={updating === t.id}
                  >
                    {['open','assigned','in_progress','resolved','escalated'].map(s => (
                      <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                    ))}
                  </select>
               </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
