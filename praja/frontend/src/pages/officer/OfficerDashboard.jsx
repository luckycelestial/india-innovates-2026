import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const STATUS_COLORS = {
  open:        { bg: 'rgba(255,107,0,0.15)',  border: 'rgba(255,107,0,0.4)',  color: '#fca974' },
  assigned:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', color: '#93c5fd' },
  in_progress: { bg: 'rgba(245,158,11,0.15)',border: 'rgba(245,158,11,0.4)',color: '#fde68a' },
  resolved:    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  color: '#86efac' },
  escalated:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#fca5a5' },
}
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#fde68a', high: '#fb923c', critical: '#f87171' }

const S = {
  wrap:       { minHeight: '100vh', background: 'var(--navy)', padding: '24px' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  logo:       { fontSize: '1.3rem', fontWeight: 900, color: 'var(--saffron)' },
  logoutBtn:  { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--light)', cursor: 'pointer', fontSize: '0.82rem' },
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' },
  stat:       { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', textAlign: 'center' },
  statNum:    { fontSize: '2rem', fontWeight: 900, color: 'var(--saffron)' },
  statLabel:  { fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  card:       { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '20px' },
  cardTitle:  { fontWeight: 800, fontSize: '1rem', marginBottom: '14px' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' },
  th:         { padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--saffron)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--saffron)', background: 'rgba(255,107,0,0.05)' },
  td:         { padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--light)' },
  badge:      (s) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: STATUS_COLORS[s]?.bg || 'rgba(100,116,139,0.15)', border: `1px solid ${STATUS_COLORS[s]?.border || 'var(--border)'}`, color: STATUS_COLORS[s]?.color || '#94a3b8' }),
  priorityDot:(p) => ({ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: PRIORITY_COLORS[p] || '#94a3b8', marginRight: '6px' }),
  actionBtn:  { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', color: 'var(--light)', cursor: 'pointer', fontSize: '0.75rem', marginRight: '4px' },
  escBtn:     { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '5px 10px', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' },
}

export default function OfficerDashboard() {
  const { user, logout } = useAuth()
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState({ status: '', priority: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTickets() }, [filter])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.status) params.status = filter.status
      if (filter.priority) params.priority = filter.priority
      const { data } = await api.get('/officers/tickets', { params })
      setTickets(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const updateStatus = async (id, status) => {
    try { await api.patch(`/officers/tickets/${id}`, { status }); loadTickets() } catch (e) { console.error(e) }
  }
  const escalate = async (id) => {
    try { await api.post(`/officers/tickets/${id}/escalate`); loadTickets() } catch (e) { console.error(e) }
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    critical: tickets.filter(t => t.priority === 'critical').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>PRAJA</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--light)' }}>Officer Dashboard &middot; {user?.name}</div>
        </div>
        <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
      <div style={S.statsRow}>
        {[['Total', stats.total, 'var(--saffron)'], ['Open', stats.open, '#60a5fa'], ['Critical', stats.critical, '#f87171'], ['Resolved', stats.resolved, '#86efac']].map(([label, val, color]) => (
          <div key={label} style={S.stat}>
            <div style={{ ...S.statNum, color }}>{val}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {['', 'open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(s => (
          <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem', background: filter.status === s ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)', color: filter.status === s ? 'var(--saffron)' : 'var(--light)', fontWeight: filter.status === s ? 700 : 400 }}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>Tickets ({tickets.length})</div>
        {loading ? <div style={{ color: 'var(--muted)' }}>Loading...</div> :
          <table style={S.table}>
            <thead><tr>{['Tracking ID', 'Title', 'Priority', 'Status', 'Created', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {tickets.length === 0
                ? <tr><td colSpan={6} style={{ ...S.td, color: 'var(--muted)', textAlign: 'center' }}>No tickets found</td></tr>
                : tickets.map(t => (
                  <tr key={t.tracking_id}>
                    <td style={{ ...S.td, color: 'var(--saffron)', fontWeight: 700 }}>{t.tracking_id}</td>
                    <td style={{ ...S.td, color: 'var(--white)' }}>{t.title}</td>
                    <td style={S.td}><span style={S.priorityDot(t.priority)} />{t.priority}</td>
                    <td style={S.td}><span style={S.badge(t.status)}>{t.status}</span></td>
                    <td style={S.td}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={S.td}>
                      <button style={S.actionBtn} onClick={() => updateStatus(t.id, 'in_progress')}>Start</button>
                      <button style={S.actionBtn} onClick={() => updateStatus(t.id, 'resolved')}>Resolve</button>
                      <button style={S.escBtn} onClick={() => escalate(t.id)}>Escalate</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  )
}
