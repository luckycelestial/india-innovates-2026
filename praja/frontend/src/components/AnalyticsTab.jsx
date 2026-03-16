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
  critical: '#dc2626', high: '#e85d04', medium: '#d97706', low: '#16a34a',
}

function KPICard({ label, value, sub, accent }) {
  return (
    <div className="an-kpi" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="an-kpi-value" style={{ color: accent }}>{value}</div>
      <div className="an-kpi-label">{label}</div>
      {sub && <div className="an-kpi-sub">{sub}</div>}
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
    <div className="an-root">
      <p className="ud-title">📊 Analytics Dashboard</p>
      <p className="ud-subtitle">Department-wide performance metrics, trends, and breakdowns.</p>

      {/* ── KPI Cards ────────────────────────────── */}
      <div className="an-kpi-grid">
        <KPICard label="Total Grievances" value={perf.total_grievances} accent={COLORS.blue} />
        <KPICard label="Resolved"        value={perf.total_resolved}   accent={COLORS.green} />
        <KPICard label="Open"            value={perf.total_open}       accent={COLORS.gold} />
        <KPICard label="Escalated"       value={perf.total_escalated}  accent={COLORS.red} />
        <KPICard label="SLA Compliance"  value={`${perf.sla_compliance_pct}%`}
                 sub={`${perf.sla_breached} breached`} accent={perf.sla_compliance_pct >= 80 ? COLORS.green : COLORS.red} />
        <KPICard label="Avg Resolution"  value={`${perf.avg_resolution_hours}h`}
                 accent={perf.avg_resolution_hours <= 24 ? COLORS.green : COLORS.gold} />
      </div>

      {/* ── 30-Day Trends ────────────────────────── */}
      <div className="an-section">
        <h3 className="an-section-title">30-Day Ticket Trends</h3>
        <div className="an-chart-card">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #dde3ef', borderRadius: 8 }}
              />
              <Legend />
              <Line type="monotone" dataKey="created"  stroke={COLORS.saffron} strokeWidth={2}
                    dot={false} name="Created" />
              <Line type="monotone" dataKey="resolved" stroke={COLORS.green}   strokeWidth={2}
                    dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Category & Priority ──────────────────── */}
      <div className="an-row">
        <div className="an-section an-flex1">
          <h3 className="an-section-title">Top Categories</h3>
          <div className="an-chart-card">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catData} layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #dde3ef', borderRadius: 8 }} />
                <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={[COLORS.saffron, COLORS.blue, COLORS.gold, COLORS.green, COLORS.red, COLORS.blueLight, COLORS.greenLight, COLORS.muted][i % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="an-section an-flex-sm">
          <h3 className="an-section-title">Priority Breakdown</h3>
          <div className="an-chart-card">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={priData} dataKey="value" nameKey="name"
                     cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                     paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                  {priData.map((d) => (
                    <Cell key={d.name} fill={PRI_COLORS[d.name.toLowerCase()] || COLORS.muted} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Resolution Time Distribution ─────────── */}
      <div className="an-section">
        <h3 className="an-section-title">Resolution Time Distribution</h3>
        <div className="an-chart-card">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={resTimes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #dde3ef', borderRadius: 8 }} />
              <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                {(resTimes || []).map((_, i) => (
                  <Cell key={i} fill={i < 3 ? COLORS.green : i < 5 ? COLORS.gold : COLORS.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
