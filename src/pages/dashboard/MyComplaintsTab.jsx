import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { Card, Badge } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { listGrievances } from '../../services/grievancesApi';

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
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ticketsData, schemesRes] = await Promise.all([
          listGrievances(user, { limit: 500 }),
          supabase.from('schemes').select('*')
        ]);

        if (schemesRes.error) throw schemesRes.error;

        setTickets(ticketsData || []);
        setSchemes(schemesRes.data || []);
      } catch (err) {
        console.error('Supabase fetch error:', err);
        setError('Failed to load data from Supabase.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleToggleTicket = (id) => {
    setExpandedTicketId(expandedTicketId === id ? null : id);
  };

  const getRelatedSchemes = (ticket) => {
    if (!ticket.ai_category) return [];
    const cat = ticket.ai_category.toLowerCase();
    const map = {
      "water supply": ["water", "sanitation"],
      "sanitation": ["sanitation", "health"],
      "health": ["health"],
      "roads": ["technology", "infrastructure", "transport"],
      "electricity": ["energy", "power"],
      "education": ["education", "school"],
      "housing": ["housing", "shelter"],
      "agriculture": ["agriculture", "farmer"],
    };
    const tags = map[cat] || [cat];
    
    return schemes.filter(s => {
      const dept = (s.department || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return tags.some(tag => dept.includes(tag) || name.includes(tag));
    });
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
      </div>

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
            const isExpanded = expandedTicketId === t.id;
            const relatedSchemes = isExpanded ? getRelatedSchemes(t) : [];

            return (
              <Card key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleToggleTicket(t.id)}>
                <div className="ud-ticket-header">
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1, lineHeight: 1.35 }}>
                    {isExpanded ? '🔽 ' : '▶️ '}{t.title || '—'}
                  </span>
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

                {isExpanded && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                    {t.description && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        {String(t.description)}
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
                    
                    {relatedSchemes.length > 0 && (
                      <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                          🏦 Recommended Government Schemes
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {relatedSchemes.map(s => (
                            <div key={s.id} style={{ padding: 12, border: '1px solid var(--color-success-border)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {s.description}
                              </div>
                              {s.benefits && (
                                <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--color-success-text)' }}>
                                  💰 <strong>Benefits:</strong> {s.benefits}
                                </div>
                              )}
                              <Button variant="outline" size="sm" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); alert('Redirecting to application portal...') }}>
                                Apply Now
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
