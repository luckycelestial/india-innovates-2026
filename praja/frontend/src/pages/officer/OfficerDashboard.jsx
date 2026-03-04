import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts'

const STATUS_META = {
  open:        { label: 'Open',        color: '#E8590C', bg: '#FFF3EC' },
  assigned:    { label: 'Assigned',    color: '#1A56DB', bg: '#EBF5FF' },
  in_progress: { label: 'In Progress', color: '#9E5A00', bg: '#FFFBEB' },
  resolved:    { label: 'Resolved',    color: '#1A7340', bg: '#E8F5EE' },
  escalated:   { label: 'Escalated',   color: '#C0392B', bg: '#FDF3F3' },
}
const PRIORITY_META = {
  low:      { label: 'Low',      color: '#6B7A99' },
  medium:   { label: 'Medium',   color: '#9E5A00' },
  high:     { label: 'High',     color: '#E8590C' },
  critical: { label: 'Critical', color: '#C0392B' },
}

function hoursOpen(createdAt) {
  if (!createdAt) return null
  const ms = Date.now() - new Date(createdAt).getTime()
  return Math.round(ms / 3600000)
}

function SLABadge({ createdAt, status }) {
  if (status === 'resolved') return null
  const h = hoursOpen(createdAt)
  if (h === null) return null
  const breached = h > 72
  const warning  = h > 48
  const color  = breached ? '#dc2626' : warning ? '#f97316' : '#6b7280'
  const bg     = breached ? '#FEF2F2' : warning ? '#FFF7ED' : 'transparent'
  const label  = h < 24 ? `${h}h` : `${Math.floor(h / 24)}d ${h % 24}h`
  return (
    <span title={`Open for ${h} hours${breached ? ' — SLA BREACHED' : ''}`}
      style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: bg, color, border: breached ? '1px solid #FECACA' : 'none' }}>
      {label}{breached ? ' !' : ''}
    </span>
  )
}

export default function OfficerDashboard() {
  const { user, logout } = useAuth()
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState({ status: '', priority: '' })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('queue')

  useEffect(() => { loadTickets() }, [filter])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.status) params.status = filter.status
      if (filter.priority) params.priority = filter.priority
      const { data } = await api.get('/officers/tickets', { params })
      setTickets(Array.isArray(data) ? data : (data.items || []))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/grievances/${id}/status`, null, { params: { status } })
      loadTickets()
    } catch (e) { console.error('Status update failed:', e.response?.data || e.message) }
  }

  // All tickets (unfiltered) for analytics — reload without filter
  const [allTickets, setAllTickets] = useState([])
  useEffect(() => {
    api.get('/officers/tickets', { params: { limit: 200 } })
      .then(r => setAllTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    sla_breached: tickets.filter(t => t.status !== 'resolved' && hoursOpen(t.created_at) > 72).length,
    critical: tickets.filter(t => t.priority === 'critical').length,
  }), [tickets])

  const analytics = useMemo(() => {
    const catMap = {}
    const prioMap = { low: 0, medium: 0, high: 0, critical: 0 }
    const statusMap = { open: 0, assigned: 0, in_progress: 0, resolved: 0, escalated: 0 }
    for (const t of allTickets) {
      const cat = t.ai_category || t.category || 'General'
      catMap[cat] = (catMap[cat] || 0) + 1
      if (t.priority in prioMap) prioMap[t.priority]++
      if (t.status in statusMap) statusMap[t.status]++
    }
    const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))
    const prioData = Object.entries(prioMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name: STATUS_META[name]?.label || name, value }))
    return { catData, prioData, statusData }
  }, [allTickets])

  const PRIO_COLORS = { Low: '#6B7A99', Medium: '#9E5A00', High: '#E8590C', Critical: '#C0392B' }
  const STATUS_COLORS = ['#E8590C', '#1A56DB', '#9E5A00', '#1A7340', '#C0392B']

  const NAVY="#080f1e",CARD="#111d35",BORDER="#1e2d4d",MUTED="#64748b",LIGHT="#94a3b8",TEXT="#e2e8f0",SAFFRON="#FF6B00",RED="#ef4444",GREEN="#22c55e",BLUE="#3b82f6",GOLD="#f59e0b"

  return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif", color: TEXT }}>
      {/* TOP BAR */}
      <div style={{ background: '#0d1526', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: SAFFRON, letterSpacing: -1 }}>PRAJA</div>
          <div style={{ fontSize: '0.62rem', color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Officer Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: LIGHT, fontSize: '0.8rem' }}>{user?.full_name || user?.name}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 6, color: LIGHT, cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: CARD, padding: 5, borderRadius: 10, border: `1px solid ${BORDER}`, width: 'fit-content' }}>
          {['queue', 'analytics'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 20px', borderRadius: 7, border: 'none',
              background: view === v ? '#1e3a5f' : 'transparent',
              color: view === v ? 'white' : MUTED,
              fontWeight: view === v ? 700 : 400, cursor: 'pointer', fontSize: '0.84rem',
            }}>{v === 'queue' ? '📋 Grievance Queue' : '📊 Analytics'}</button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {[
            ['📋 Total', stats.total, SAFFRON],
            ['🔓 Open', stats.open, BLUE],
            ['⏰ SLA Breached', stats.sla_breached, RED],
            ['🚨 Critical', stats.critical, RED],
          ].map(([lbl, val, color]) => (
            <div key={lbl} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* QUEUE VIEW */}
        {view === 'queue' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              {['', 'open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(s => (
                <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))} style={{
                  padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter.status === s ? SAFFRON : BORDER}`,
                  background: filter.status === s ? `${SAFFRON}22` : CARD,
                  color: filter.status === s ? SAFFRON : MUTED,
                  fontWeight: filter.status === s ? 700 : 400, cursor: 'pointer', fontSize: '0.82rem',
                }}>{s === '' ? 'All' : STATUS_META[s]?.label || s}</button>
              ))}
              <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))} style={{ marginLeft: 'auto', padding: '6px 12px', border: `1.5px solid ${BORDER}`, borderRadius: 8, background: CARD, color: TEXT, fontSize: '0.83rem', cursor: 'pointer' }}>
                <option value="">All Priorities</option>
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
            </div>

            {/* Table */}
            <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>No tickets match the current filters.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#0d1526' }}>
                      {['Tracking ID', 'Title', 'Category', 'Priority', 'SLA', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', borderBottom: `2px solid ${BORDER}`, fontSize: '0.65rem', letterSpacing: '1.2px', textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => {
                      const sm = STATUS_META[t.status] || { label: t.status, color: LIGHT, bg: CARD }
                      const pm = PRIORITY_META[t.priority] || { label: t.priority, color: LIGHT }
                      const slaBreached = t.status !== 'resolved' && hoursOpen(t.created_at) > 72
                      return (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}44`, background: slaBreached ? `${RED}08` : 'transparent' }}>
                          <td style={{ padding: '12px 14px' }}><code style={{ fontSize: '0.75rem', background: '#0d1526', padding: '2px 7px', borderRadius: 4, color: SAFFRON }}>{t.tracking_id}</code></td>
                          <td style={{ padding: '12px 14px', maxWidth: 200 }}><div style={{ fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div></td>
                          <td style={{ padding: '12px 14px', color: MUTED }}>{t.ai_category || '-'}</td>
                          <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, fontSize: '0.8rem', color: pm.color }}>{pm.label}</span></td>
                          <td style={{ padding: '12px 14px' }}><SLABadge createdAt={t.created_at} status={t.status} /></td>
                          <td style={{ padding: '12px 14px' }}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span></td>
                          <td style={{ padding: '12px 14px' }}>
                            {t.status === 'open' && <button onClick={() => updateStatus(t.id, 'assigned')} style={{ marginRight: 6, padding: '4px 10px', background: `${BLUE}22`, border: `1px solid ${BLUE}44`, borderRadius: 5, color: BLUE, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Start</button>}
                            {['assigned','in_progress'].includes(t.status) && <button onClick={() => updateStatus(t.id, 'resolved')} style={{ marginRight: 6, padding: '4px 10px', background: `${GREEN}22`, border: `1px solid ${GREEN}44`, borderRadius: 5, color: GREEN, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Resolve</button>}
                            {!['resolved','escalated'].includes(t.status) && <button onClick={() => updateStatus(t.id, 'escalated')} style={{ padding: '4px 10px', background: `${RED}22`, border: `1px solid ${RED}44`, borderRadius: 5, color: RED, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Escalate</button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ANALYTICS VIEW */}
        {view === 'analytics' && (
          <div style={{ display: 'grid', gap: 18 }}>
            {/* Category bar chart */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: TEXT }}>Grievances by Department</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.catData} margin={{ top: 0, right: 10, left: -10, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]}>
                    {analytics.catData.map((_, i) => (
                      <Cell key={i} fill={['#1e3a5f','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#e8590c','#fb923c'][i % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* Priority pie */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: TEXT }}>Priority Distribution</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analytics.prioData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                      {analytics.prioData.map(({ name }) => (
                        <Cell key={name} fill={PRIO_COLORS[name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status breakdown */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: TEXT }}>Status Breakdown</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.statusData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {analytics.statusData.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}