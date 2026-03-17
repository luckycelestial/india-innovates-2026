import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

const COLORS = {
  saffron: '#e85d04', gold: '#d97706', green: '#16a34a',
  red: '#dc2626', blue: '#1d4ed8', muted: '#6b7280',
  greenLight: '#22c55e', blueLight: '#3b82f6',
}

const PRI_COLORS = {
  critical: 'var(--color-danger)', 
  high: 'var(--color-primary-dark)', 
  medium: 'var(--color-warning)', 
  low: 'var(--color-success)'
}

function KPICard({ label, value, sub, accent }) {
  return (
    <div style={{ 
      background: 'var(--bg-surface)', 
      border: '1px solid var(--border-color)', 
      borderTop: `4px solid ${accent}`,
      borderRadius: 'var(--radius-lg)', 
      padding: '20px 24px',
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}>
      <div style={{ color: accent, fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

export default function AnalyticsTab() {
  const [perf, setPerf]       = useState(null)
  const [trends, setTrends]   = useState([])
  const [resTimes, setRes]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [p, t, r] = await Promise.all([
          api.get('/officers/performance'),
          api.get('/officers/analytics/trends'),
          api.get('/officers/analytics/resolution-times'),
        ])
        if (!alive) return
        setPerf(p.data)
        setTrends(t.data)
        setRes(r.data)
      } catch (e) {
        if (alive) setError(e.response?.data?.detail || 'Failed to load analytics')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  if (loading) return <div className="an-loading">Loading analytics…</div>
  if (error)   return <div className="an-error">{error}</div>
  if (!perf)   return null

  const catData  = (perf.category_breakdown || []).slice(0, 8)
  const priData  = Object.entries(perf.priority_breakdown || {})
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .filter(d => d.value > 0)

  // Shorten trend dates for x-axis
  const trendData = (trends || []).map(d => ({
    ...d,
    label: (d.date || '').slice(5), // "MM-DD"
  }))

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            📊 Analytics Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Department-wide performance metrics, trends, and SLA breakdown.
          </p>
        </div>
      </div>

      {/* ── KPI Cards Grid ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <KPICard label="Total Grievances" value={perf.total_grievances} accent="var(--color-primary)" />
        <KPICard label="Resolved"        value={perf.total_resolved}   accent="var(--color-success)" />
        <KPICard label="Open"            value={perf.total_open}       accent="var(--color-warning)" />
        <KPICard label="Escalated"       value={perf.total_escalated}  accent="var(--color-danger)" />
        <KPICard label="SLA Compliance"  value={`${perf.sla_compliance_pct}%`}
                 sub={`${perf.sla_breached} breached`} accent={perf.sla_compliance_pct >= 80 ? 'var(--color-success)' : 'var(--color-danger)'} />
        <KPICard label="Avg Resolution"  value={`${perf.avg_resolution_hours}h`}
                 accent={perf.avg_resolution_hours <= 24 ? 'var(--color-success)' : 'var(--color-warning)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* ── 30-Day Trends ────────────────────────── */}
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>30-Day Ticket Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} interval={3} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontWeight: 600 }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="created"  stroke="var(--color-primary)" strokeWidth={3}
                    dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Created Issues" />
              <Line type="monotone" dataKey="resolved" stroke="var(--color-success)"   strokeWidth={3}
                    dot={{ r: 3, fill: 'var(--color-success)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Resolved Issues" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Priority Breakdown Donut ──────────────────── */}
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={priData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                   paddingAngle={4} stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {priData.map((d) => (
                  <Cell key={d.name} fill={PRI_COLORS[d.name.toLowerCase()] || 'var(--text-muted)'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* ── Category Breakdown ──────────────────── */}
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>Issue Categories</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData} layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" width={130} tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--bg-body)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" name="Tickets" radius={[0, 4, 4, 0]} barSize={24}>
                {catData.map((_, i) => (
                  <Cell key={i} fill={[
                    'var(--color-primary)', 'var(--color-secondary)', 'var(--color-success)', 
                    'var(--color-warning)', 'var(--color-info)', 'var(--color-danger)'
                  ][i % 6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Resolution Time Distribution ─────────── */}
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>Resolution Speed (Hours)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={resTimes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="bucket" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--bg-body)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} barSize={32}>
                {(resTimes || []).map((_, i) => (
                  <Cell key={i} fill={i < 3 ? 'var(--color-success)' : i < 5 ? 'var(--color-warning)' : 'var(--color-danger)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
