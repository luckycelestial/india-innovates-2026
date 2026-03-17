import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import { Card, Badge } from '../../components/ui/Card';
import { useFetch } from '../../hooks/useFetch';

const STATUS_LABEL = {
  open:        'Open',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  escalated:   'Escalated',
  closed:      'Closed',
};

const getSlaStatus = (sla_deadline) => {
  if (!sla_deadline) return null;
  const now = new Date();
  const sla = new Date(sla_deadline);
  const hoursLeft = (sla - now) / 3600000;
  if (hoursLeft < 0) return { text: `SLA breached ${Math.abs(Math.round(hoursLeft))}h ago`, variant: 'escalated' };
  if (hoursLeft < 24) return { text: `${Math.round(hoursLeft)}h left`, variant: 'warning' };
  return { text: `${Math.round(hoursLeft / 24)}d left`, variant: 'success' };
};

export default function MyComplaintsTab() {
  const { data: _tickets, loading, error } = useFetch('/grievances/');
  const [showSchemes, setShowSchemes] = useState(false);
  const { data: _schemes, execute: loadSchemes } = useFetch('/grievances/schemes', {}, false);

  const tickets = _tickets || [];
  const schemes = _schemes || [];

  const handleToggleSchemes = () => {
    if (!showSchemes && schemes.length === 0) loadSchemes();
    setShowSchemes(!showSchemes);
  };

  if (loading) return <p className="ud-loading" />;
  if (error) return (
    <Card>
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
        <div style={{ color: 'var(--color-danger-text, #dc2626)', fontWeight: 600, marginBottom: 6 }}>Unable to load complaints</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{error}</div>
      </div>
    </Card>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="ud-title">My Complaints</p>
          <p className="ud-subtitle" style={{ marginBottom: 0 }}>
            {tickets.length} complaint{tickets.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleToggleSchemes}>
          {showSchemes ? '📋 Hide Schemes' : '🏛️ Government Schemes'}
        </Button>
      </div>

      {/* Schemes section */}
      {showSchemes && schemes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Eligible Schemes {schemes.some(s => s.is_matched) && <Badge variant="success" style={{ marginLeft: 6 }}>✓ Matched</Badge>}
          </div>
          <div className="ud-schemes-grid">
            {schemes.map(s => (
              <Card key={s.id} className={s.is_matched ? 'border-success' : ''}>
                <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.name}
                  {s.is_matched && <Badge variant="warning">Recommended</Badge>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{s.department}</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{s.description}</div>
                {s.benefits && <div style={{ marginTop: 8, fontSize: '0.84rem', color: 'var(--color-success-text)' }}>💰 {s.benefits}</div>}
                {s.eligibility_criteria && <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>📋 {s.eligibility_criteria}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <Card>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>No complaints yet</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Use the <strong>Submit</strong> tab above to file your first complaint.
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tickets.map(t => {
            const sla = getSlaStatus(t.sla_deadline);
            return (
              <Card key={t.id}>
                <div className="ud-ticket-header">
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1, lineHeight: 1.35 }}>{t.title || '—'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {sla && t.status !== 'resolved' && (
                      <Badge variant={sla.variant}>⏱ {sla.text}</Badge>
                    )}
                    <Badge variant={t.status || 'open'}>
                      {STATUS_LABEL[t.status] || t.status || 'Open'}
                    </Badge>
                  </div>
                </div>

                <div className="ud-ticket-meta">
                  {t.tracking_id && <span className="ud-tracking-id">{t.tracking_id}</span>}
                  {t.ai_category && <span>📂 {t.ai_category}</span>}
                  {t.priority && (
                    <span className={`ud-pri-${t.priority}`}>{t.priority.toUpperCase()}</span>
                  )}
                  {t.escalation_level > 0 && (
                    <span style={{ color: 'var(--color-danger-text)', fontWeight: 700 }}>
                      🔺 Level {t.escalation_level}
                    </span>
                  )}
                </div>

                {t.description && (
                  <div style={{ marginTop: 10, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {String(t.description).length > 160
                      ? `${String(t.description).slice(0, 160)}…`
                      : String(t.description)}
                  </div>
                )}
                {t.photo_url && (
                  <img src={t.photo_url} alt="Evidence" style={{ marginTop: 10, maxWidth: 220, maxHeight: 160, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                )}
                {t.status === 'resolved' && t.resolution_note && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    borderLeft: '3px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.84rem', color: 'var(--color-success-text)',
                  }}>
                    ✅ {t.resolution_note}
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
