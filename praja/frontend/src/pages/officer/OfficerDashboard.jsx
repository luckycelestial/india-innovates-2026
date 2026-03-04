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
      await api.put(`/grievances/${id}/status`, { status })
      loadTickets()
    } catch (e) { alert(e.response?.data?.detail || 'Error updating') }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />
      <div style={{ background: 'var(--navy)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>PRAJA</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Officer Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{user?.full_name || user?.name}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', background: 'var(--card)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)', width: 'fit-content' }}>
          {['queue', 'analytics'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 20px', borderRadius: '7px', border: 'none',
              background: view === v ? 'var(--navy)' : 'transparent',
              color: view === v ? 'white' : 'var(--muted)',
              fontWeight: view === v ? 700 : 400, cursor: 'pointer', fontSize: '0.84rem', textTransform: 'capitalize'
            }}>{v === 'queue' ? 'Grievance Queue' : 'Analytics'}</button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '22px' }}>
          {[
            ['Total', stats.total, 'var(--navy)'],
            ['Open', stats.open, 'var(--saffron)'],
            ['SLA Breached', stats.sla_breached, '#dc2626'],
            ['Critical', stats.critical, 'var(--danger)'],
          ].map(([lbl, val, color]) => (
            <div key={lbl} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* QUEUE VIEW */}
        {view === 'queue' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {['', 'open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(s => (
                <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))} style={{
                  padding: '7px 16px', borderRadius: '20px', border: `1.5px solid ${filter.status === s ? 'var(--navy)' : 'var(--border)'}`,
                  background: filter.status === s ? 'var(--navy-light)' : 'var(--card)',
                  color: filter.status === s ? 'var(--navy)' : 'var(--muted)',
                  fontWeight: filter.status === s ? 700 : 400, cursor: 'pointer', fontSize: '0.82rem',
                }}>{s === '' ? 'All' : STATUS_META[s]?.label || s}</button>
              ))}
              <div style={{ marginLeft: 'auto' }}>
                <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))} style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.83rem', cursor: 'pointer' }}>
                  <option value="">All Priorities</option>
                  {['low','medium','high','critical'].map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No tickets match the current filters.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Tracking ID', 'Title', 'Category', 'Priority', 'SLA', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', borderBottom: '2px solid var(--border)', fontSize: '0.65rem', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => {
                      const sm = STATUS_META[t.status] || { label: t.status, color: '#555', bg: '#eee' }
                      const pm = PRIORITY_META[t.priority] || { label: t.priority, color: '#555' }
                      const slaBreached = t.status !== 'resolved' && hoursOpen(t.created_at) > 72
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #F0F4FA', background: slaBreached ? '#FFF5F5' : 'transparent' }}>
                          <td style={{ padding: '12px 14px' }}><code style={{ fontSize: '0.75rem', background: 'var(--bg)', padding: '2px 7px', borderRadius: '4px' }}>{t.tracking_id}</code></td>
                          <td style={{ padding: '12px 14px', maxWidth: '200px' }}><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div></td>
                          <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{t.ai_category || '-'}</td>
                          <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 700, fontSize: '0.8rem', color: pm.color }}>{pm.label}</span></td>
                          <td style={{ padding: '12px 14px' }}><SLABadge createdAt={t.created_at} status={t.status} /></td>
                          <td style={{ padding: '12px 14px' }}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span></td>
                          <td style={{ padding: '12px 14px' }}>
                            {t.status === 'open' && <button onClick={() => updateStatus(t.id, 'assigned')} style={{ marginRight: '6px', padding: '4px 10px', background: 'var(--navy-light)', border: '1px solid #C5D5F0', borderRadius: '5px', color: 'var(--navy)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Start</button>}
                            {['assigned','in_progress'].includes(t.status) && <button onClick={() => updateStatus(t.id, 'resolved')} style={{ marginRight: '6px', padding: '4px 10px', background: 'var(--green-light)', border: '1px solid #A3D9B8', borderRadius: '5px', color: 'var(--green)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Resolve</button>}
                            {!['resolved','escalated'].includes(t.status) && <button onClick={() => updateStatus(t.id, 'escalated')} style={{ padding: '4px 10px', background: '#FDF3F3', border: '1px solid #F5C6CB', borderRadius: '5px', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Escalate</button>}
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
          <div style={{ display: 'grid', gap: '18px' }}>
            {/* Category bar chart */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>Grievances by Department</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              {/* Priority pie */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>Priority Distribution</div>
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
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px' }}>Status Breakdown</div>
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