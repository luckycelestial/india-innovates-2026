import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import { Card, Badge } from '../../components/ui/Card';
import { useFetch, useMutation } from '../../hooks/useFetch';

const STATUS_LABEL = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', escalated: 'Escalated', closed: 'Closed',
};

const getSlaStatus = (sla_deadline) => {
  if (!sla_deadline) return null;
  const now = new Date();
  const sla = new Date(sla_deadline);
  const hoursLeft = (sla - now) / 3600000;
  if (hoursLeft < 0) return { text: `Breached ${Math.abs(Math.round(hoursLeft))}h ago`, cls: 'sla-breach' };
  if (hoursLeft < 24) return { text: `${Math.round(hoursLeft)}h left`, cls: 'sla-warning' };
  return { text: `${Math.round(hoursLeft / 24)}d left`, cls: 'sla-ok' };
};

export default function MyComplaintsTab() {
  const { data: tickets = [], loading } = useFetch('/grievances/');
  const [showSchemes, setShowSchemes] = useState(false);
  const { data: schemes = [], execute: loadSchemes } = useFetch('/grievances/schemes', {}, false);

  const handleToggleSchemes = () => {
    if (!showSchemes && schemes.length === 0) {
      loadSchemes();
    }
    setShowSchemes(!showSchemes);
  };

  if (loading) return <p className="ud-loading">Loading complaints...</p>;

  return (
    <div>
      <p className="ud-title">My Complaints</p>
      <p className="ud-subtitle">{tickets.length} complaint{tickets.length !== 1 ? 's' : ''} filed</p>

      <Button variant="secondary" className="mb-4" onClick={handleToggleSchemes}>
        {showSchemes ? '📋 Hide Schemes' : '🏛️ View Eligible Government Schemes'}
      </Button>

      {showSchemes && schemes.length > 0 && (
        <div className="ud-schemes-section mb-6">
          <p className="ud-subtitle mt-0">
            Government Schemes {schemes.some(s => s.is_matched) && <Badge variant="success" className="ml-2">✓ Matched</Badge>}
          </p>
          <div className="ud-schemes-grid">
            {schemes.map(s => (
              <Card key={s.id} className={`ud-scheme-card ${s.is_matched ? 'border-success' : ''}`}>
                <div className="font-bold text-lg">{s.name} {s.is_matched && <Badge variant="warning">Recommended</Badge>}</div>
                <div className="text-sm text-gray-500 mb-2">{s.department}</div>
                <div className="text-sm">{s.description}</div>
                {s.benefits && <div className="mt-2 text-sm text-green-700">💰 {s.benefits}</div>}
                {s.eligibility_criteria && <div className="mt-1 text-sm text-gray-600">📋 {s.eligibility_criteria}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="ud-alert-empty">No complaints yet. Use "Submit" tab to file one.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map(t => {
            const sla = getSlaStatus(t.sla_deadline);
            return (
              <Card key={t.id}>
                <div className="ud-ticket-header flex justify-between">
                  <span className="font-semibold text-lg">{t.title || '—'}</span>
                  <div className="flex items-center gap-2">
                    {sla && t.status !== 'resolved' && (
                      <Badge variant={sla.cls === 'sla-breach' ? 'danger' : sla.cls === 'sla-warning' ? 'warning' : 'success'}>
                        ⏱ {sla.text}
                      </Badge>
                    )}
                    <Badge variant={t.status || 'open'}>
                      {STATUS_LABEL[t.status] || t.status || 'Open'}
                    </Badge>
                  </div>
                </div>
                <div className="ud-ticket-meta flex gap-3 text-sm text-gray-500 mt-2">
                  <span className="font-mono">{t.tracking_id || '—'}</span>
                  {t.ai_category && <span>{t.ai_category}</span>}
                  {t.priority && (
                    <span className={`ud-pri-${t.priority} font-bold`}>{t.priority.toUpperCase()}</span>
                  )}
                  {t.escalation_level > 0 && (
                    <span className="text-red-600 font-bold">🔺 Level {t.escalation_level}</span>
                  )}
                </div>
                
                {t.photo_url && <img src={t.photo_url} alt="Evidence" className="mt-3 max-w-xs rounded-md" />}
                
                {t.description && (
                  <div className="mt-3 text-gray-700 text-sm">
                    {String(t.description).length > 150 
                      ? `${String(t.description).slice(0, 150)}...` 
                      : String(t.description)}
                  </div>
                )}
                
                {t.status === 'resolved' && t.resolution_note && (
                  <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-md text-sm border border-green-200">
                    ✅ Resolution: {t.resolution_note}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
