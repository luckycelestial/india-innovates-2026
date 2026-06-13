'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart2, TrendingUp, AlertTriangle, CheckCircle2, 
  MapPin, Clock, Search, RefreshCw, Layout, Layers,
  Compass, PieChart, ShieldAlert, Award
} from 'lucide-react'

type Complaint = {
  id: string
  complaint_number: string
  title: string
  category: string
  description: string | null
  location: string
  priority: string
  status: string
  is_anonymous: boolean
  assigned_to: string | null
  department: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type KpiCardProps = {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  accentColor: string
  bgColor: string
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const CATEGORY_COLORS: Record<string, string> = {
  road: '#024ad8',
  water: '#0ea5e9',
  electricity: '#eab308',
  sanitation: '#10b981',
  streetlight: '#f59e0b',
  drainage: '#a855f7',
  waste: '#64748b',
  other: '#6b7280'
}

declare global {
  interface Window {
    L: any
  }
}

function LeafletHeatmap({ complaints }: { complaints: Complaint[] }) {
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
      return
    }

    // Load Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    // Load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      setMapLoaded(true)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapLoaded || !window.L) return

    const locationCoords: Record<string, [number, number]> = {
      'Ward 12, Main Cross': [12.9796, 77.5906],
      'Ward 5, NH-44 near Petrol Pump': [12.9626, 77.6106],
      'Ward 2, Gandhi Nagar School Road': [12.9816, 77.5746],
      'Ward 9, Block C Metro Layout': [12.9516, 77.5846],
      'Ward 11, 5th Avenue Link Road': [12.9906, 77.6016]
    }

    const container = document.getElementById('leaflet-map-container')
    if (!container) return

    // Recreate element to prevent Leaflet already initialized error
    container.innerHTML = '<div id="actual-map-element" style="height: 100%; width: 100%; border-radius: 12px;"></div>'

    const L = window.L
    const map = L.map('actual-map-element').setView([12.9716, 77.5946], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Group complaints by location
    const groups: Record<string, {
      total: number
      overdue: number
      active: number
      resolved: number
    }> = {}

    complaints.forEach(c => {
      const loc = c.location || 'General/Unknown'
      if (!groups[loc]) {
        groups[loc] = { total: 0, overdue: 0, active: 0, resolved: 0 }
      }
      const g = groups[loc]
      g.total += 1
      
      const isClosed = c.status === 'resolved' || c.status === 'closed'
      if (isClosed) {
        g.resolved += 1
      } else {
        g.active += 1
        const dueTime = new Date(c.created_at).getTime() + (c.priority === 'urgent' ? 24 : c.priority === 'high' ? 48 : c.priority === 'medium' ? 120 : 168) * 60 * 60 * 1000
        if (Date.now() > dueTime || c.status === 'escalated') {
          g.overdue += 1
        }
      }
    })

    // Plot circles on map
    Object.entries(groups).forEach(([locationName, stats]) => {
      let coords = locationCoords[locationName]
      if (!coords) {
        let hash = 0
        for (let i = 0; i < locationName.length; i++) {
          hash = locationName.charCodeAt(i) + ((hash << 5) - hash)
        }
        const latOffset = (hash % 100) / 2000
        const lngOffset = ((hash >> 8) % 100) / 2000
        coords = [12.9716 + latOffset, 77.5946 + lngOffset]
      }

      // areas in green yellow and red marking the areas of complaints
      let color = '#22c55e' // Green
      if (stats.overdue > 0) {
        color = '#ef4444' // Red
      } else if (stats.active > 0) {
        color = '#f59e0b' // Yellow
      }

      const radius = 250 + (stats.total * 80)

      const circle = L.circle(coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.45,
        radius: radius
      }).addTo(map)

      circle.bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 160px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            📍 ${locationName}
          </h4>
          <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px; color: #475569;">
            <span>Total Tickets: <strong>${stats.total}</strong></span>
            <span style="color: #ef4444; font-weight: 600;">Overdue: ${stats.overdue}</span>
            <span style="color: #ea580c; font-weight: 600;">Active: ${stats.active}</span>
            <span style="color: #166534; font-weight: 600;">Resolved: ${stats.resolved}</span>
          </div>
        </div>
      `)
    })

    return () => {
      map.remove()
    }
  }, [mapLoaded, complaints])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '340px' }}>
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#f8fafc',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <span className="animate-spin" style={{ marginRight: '8px', border: '2px solid #cbd5e1', borderTopColor: '#024ad8', borderRadius: '50%', width: '16px', height: '16px' }} />
          Loading Leaflet OSM Map...
        </div>
      )}
      <div id="leaflet-map-container" style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
    </div>
  )
}

export default function SentinelPulseAnalyticsPage() {
  const supabase = createClient()

  // Data state
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime] = useState<number>(Date.now())

  // Filter state
  const [deptFilter, setDeptFilter] = useState('all')
  const [wardFilter, setWardFilter] = useState('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d'>('all')

  // Load complaints
  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: true }) // chronological order for trend charts

      if (!error && data) {
        setComplaints(data)
      }
    } catch (e) {
      console.error('Error fetching complaints:', e)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await fetchComplaints()
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchComplaints()
    setRefreshing(false)
  }

  // ─── FILTER LOGIC ────────────────────────────────────────────────────────
  const filteredComplaints = complaints.filter(c => {
    const matchesDept = deptFilter === 'all' || c.department === deptFilter
    const matchesWard = wardFilter === 'all' || c.location === wardFilter

    if (dateRangeFilter === 'all') return matchesDept && matchesWard

    const createdTime = new Date(c.created_at).getTime()
    const daysAgo = dateRangeFilter === '7d' ? 7 : 30
    const thresholdTime = currentTime - daysAgo * 24 * 60 * 60 * 1000

    return matchesDept && matchesWard && createdTime >= thresholdTime
  })

  // ─── DYNAMIC AGGREGATIONS ────────────────────────────────────────────────
  const totalCount = filteredComplaints.length
  
  const resolvedList = filteredComplaints.filter(c => c.status === 'resolved' || c.status === 'closed')
  const resolvedCount = resolvedList.length
  const openCount = totalCount - resolvedCount

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

  // Calculate unique active locations (wards)
  const uniqueWardsList = Array.from(new Set(complaints.map(c => c.location).filter(Boolean)))
  const activeWardsCount = Array.from(new Set(filteredComplaints.map(c => c.location).filter(Boolean))).length

  const escalatedCount = filteredComplaints.filter(c => c.status === 'escalated').length

  // Average resolution or age calculation
  const getAverageAgeHours = () => {
    if (filteredComplaints.length === 0) return 0
    let totalHours = 0
    filteredComplaints.forEach(c => {
      const created = new Date(c.created_at).getTime()
      const end = (c.status === 'resolved' || c.status === 'closed') ? new Date(c.updated_at).getTime() : currentTime
      totalHours += (end - created) / (1000 * 60 * 60)
    })
    return Math.round(totalHours / filteredComplaints.length)
  }
  const avgAgeHours = getAverageAgeHours()

  // Ward Hotspots Grouping
  const wardGrouping = filteredComplaints.reduce((acc, c) => {
    const ward = c.location || 'General/Unknown'
    acc[ward] = (acc[ward] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sortedWards = Object.entries(wardGrouping)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Category Distribution Grouping
  const categoryGrouping = filteredComplaints.reduce((acc, c) => {
    const cat = c.category || 'other'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categoryMix = Object.entries(categoryGrouping)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.other
    }))
    .sort((a, b) => b.count - a.count)

  // Department Table Metrics
  const deptsList = Array.from(new Set(complaints.map(c => c.department).filter(Boolean))) as string[]
  const departmentMetrics = deptsList.map(deptName => {
    const deptComplaints = filteredComplaints.filter(c => c.department === deptName)
    const deptResolved = deptComplaints.filter(c => c.status === 'resolved' || c.status === 'closed')
    
    let totalAgeHours = 0
    deptComplaints.forEach(c => {
      const created = new Date(c.created_at).getTime()
      const end = (c.status === 'resolved' || c.status === 'closed') ? new Date(c.updated_at).getTime() : currentTime
      totalAgeHours += (end - created) / (1000 * 60 * 60)
    })
    const avgAge = deptComplaints.length > 0 ? Math.round(totalAgeHours / deptComplaints.length) : 0

    return {
      name: deptName,
      total: deptComplaints.length,
      resolved: deptResolved.length,
      rate: deptComplaints.length > 0 ? Math.round((deptResolved.length / deptComplaints.length) * 100) : 0,
      avgAge
    }
  }).sort((a, b) => b.total - a.total)

  // Complaint Trend Calculations (grouped by day of week)
  const getTrendData = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]
    
    filteredComplaints.forEach(c => {
      const date = new Date(c.created_at)
      dayCounts[date.getDay()] += 1
    })

    // Rotate array so today is the last element
    const todayIndex = new Date().getDay()
    const rotatedLabels: string[] = []
    const rotatedValues: number[] = []

    for (let i = 6; i >= 0; i--) {
      const index = (todayIndex - i + 7) % 7
      rotatedLabels.push(days[index].substring(0, 3))
      rotatedValues.push(dayCounts[index])
    }

    return { labels: rotatedLabels, values: rotatedValues }
  }

  const trend = getTrendData()
  const maxTrendVal = Math.max(...trend.values, 1)

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* SentinelPulse Header & live alert ticker banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
        }}>
          {/* Decorative glass glow */}
          <div style={{
            position: 'absolute',
            right: '-10%',
            top: '-50%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.08)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#38bdf8', marginBottom: '12px' }}>
                <Compass size={12} className="animate-spin" />
                SentinelPulse Civic Intelligence
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '38px', lineHeight: 1.1, color: '#ffffff' }}>
                Operational Overview &amp; Trends
              </h1>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#94a3b8', marginTop: '6px', fontWeight: 400 }}>
                Aggregated workspace analytics covering civic hotspots, SLA metrics, and resolution progress.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 120ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {/* ─── FILTERS STRIP ──────────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Filters
          </span>

          {/* Date range filter */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {(['all', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRangeFilter(range)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: dateRangeFilter === range ? '#ffffff' : 'transparent',
                  color: dateRangeFilter === range ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: dateRangeFilter === range ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 100ms'
                }}
              >
                {range === 'all' ? 'All Time' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Departments</option>
            {deptsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Ward/Location Filter */}
          <select
            value={wardFilter}
            onChange={e => setWardFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Locations</option>
            {uniqueWardsList.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {filteredComplaints.length !== complaints.length && (
            <button
              onClick={() => {
                setDeptFilter('all')
                setWardFilter('all')
                setDateRangeFilter('all')
              }}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#024ad8',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* ─── KPI GRIDS ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <KpiCard
            title="Total Complaints"
            value={totalCount}
            subtitle="Received tickets"
            accentColor="#024ad8"
            bgColor="#e8f0fe"
            icon={<Layers size={20} />}
          />
          <KpiCard
            title="Open Workload"
            value={openCount}
            subtitle="Tickets in progress"
            accentColor="#eab308"
            bgColor="#fef9c3"
            icon={<TrendingUp size={20} />}
          />
          <KpiCard
            title="Resolved Grievances"
            value={resolvedCount}
            subtitle="Resolved/Closed cases"
            accentColor="#10b981"
            bgColor="#dcfce7"
            icon={<CheckCircle2 size={20} />}
          />
          <KpiCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            subtitle="Target threshold: 90%"
            accentColor="#0ea5e9"
            bgColor="#e0f2fe"
            icon={<Award size={20} />}
          />
          <KpiCard
            title="Average Resolution"
            value={`${avgAgeHours} Hours`}
            subtitle="Operational grievance age"
            accentColor="#a855f7"
            bgColor="#f3e8ff"
            icon={<Clock size={20} />}
          />
        </div>

        {/* ─── LEAFLET HEATMAP ───────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
            SentinelPulse Live Heatmap
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            Real-time geospatial representation of grievances across city wards. Red circles mark areas with overdue tickets, yellow represents active tickets on-track, and green represents fully resolved zones.
          </p>
          <div style={{ height: '400px', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#f1f5f9' }}>
            <LeafletHeatmap complaints={filteredComplaints} />
          </div>
        </div>

        {/* ─── TREND CHARTS AND HOTSPOTS ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
          
          {/* Trend Chart (SVG Line & Area) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              Complaint Intake Trend
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              Daily ticket intake trends over the last 7 calendar days.
            </p>

            <div style={{ width: '100%' }}>
              <svg viewBox="0 0 500 240" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#024ad8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#024ad8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="40" x2="450" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="90" x2="450" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="140" x2="450" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="190" x2="450" y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Left labels */}
                <text x="40" y="44" fill="#94a3b8" fontSize="10" textAnchor="end">{Math.round(maxTrendVal)}</text>
                <text x="40" y="119" fill="#94a3b8" fontSize="10" textAnchor="end">{Math.round(maxTrendVal / 2)}</text>
                <text x="40" y="194" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

                {/* Draw Trend Area & Line Path */}
                {(() => {
                  const points = trend.values.map((val, i) => {
                    const x = 50 + (i * 66.6)
                    const y = 190 - (val / maxTrendVal) * 130
                    return { x, y }
                  })

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                  const areaD = `${pathD} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`

                  return (
                    <>
                      <path d={areaD} fill="url(#gradient-area)" />
                      <path d={pathD} fill="none" stroke="#024ad8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Dots on line */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#024ad8" strokeWidth="2.5" />
                          <text x={p.x} y={p.y - 10} fill="#024ad8" fontSize="11" fontWeight="700" textAnchor="middle">{trend.values[i]}</text>
                        </g>
                      ))}
                    </>
                  )
                })()}

                {/* X Axis Labels */}
                {trend.labels.map((lbl, i) => (
                  <text key={lbl} x={50 + (i * 66.6)} y="215" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">{lbl}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Civic Hotspots Ranked List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            minHeight: '335px'
          }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              Top Civic Hotspots
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Wards or zones registering the highest complaint concentrations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sortedWards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                  No hotspot data available.
                </div>
              ) : (
                sortedWards.map((ward, idx) => {
                  const maxCount = sortedWards[0].count
                  const pct = maxCount > 0 ? Math.round((ward.count / maxCount) * 100) : 0
                  return (
                    <div key={ward.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                        <span>#{idx + 1} {ward.name}</span>
                        <span style={{ color: '#dc2626' }}>{ward.count} Tickets</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* ─── CATEGORY SPLIT AND DEPARTMENT PERFORMANCE MATRIX ─────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Category Distribution progress list */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              Complaint Mix
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              Grievance types and volume distribution across categories.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {categoryMix.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                  No category data available.
                </div>
              ) : (
                categoryMix.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                        {cat.name}
                      </span>
                      <span style={{ fontWeight: 700, color: '#475569' }}>
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.percentage}%`, background: cat.color }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Performance Matrix */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
                Departmental Efficiency Matrix
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Core performance statistics showing ticket load, completion rate, and resolution speed.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px' }}>Department</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Total Load</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Resolved</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>SLA Compliance</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Avg Age</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No department metrics available.
                      </td>
                    </tr>
                  ) : (
                    departmentMetrics.map(dept => (
                      <tr key={dept.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#1e293b' }}>
                          🏢 {dept.name}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600 }}>
                          {dept.total}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: '#166534' }}>
                          {dept.resolved}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: dept.rate >= 80 ? '#dcfce7' : dept.rate >= 50 ? '#ffedd5' : '#fee2e2',
                            color: dept.rate >= 80 ? '#166534' : dept.rate >= 50 ? '#d97706' : '#b3262b'
                          }}>
                            {dept.rate}%
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                          {dept.avgAge} Hours
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </main>
  )
}

function KpiCard({ title, value, subtitle, icon, accentColor, bgColor }: KpiCardProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '22px 24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        <span style={{
          padding: '6px',
          borderRadius: '8px',
          background: bgColor,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: '#0f172a', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
        {subtitle}
      </div>
    </div>
  )
}
