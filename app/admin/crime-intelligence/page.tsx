'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ShieldAlert, MapPin, Clock, Search, RefreshCw, 
  Layers, Compass, Flame, Radio, AlertTriangle
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident } from '@/lib/ksp/mockData'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

// District default coordinates in Karnataka
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Bengaluru Urban": [12.9716, 77.5946],
  "Mysuru": [12.2958, 76.6394],
  "Hubballi-Dharwad": [15.3647, 75.1240],
  "Belagavi": [15.8497, 74.4977],
  "Mangaluru": [12.9141, 74.8560],
  "Mandya": [12.5218, 76.8973],
  "Kalaburagi": [17.3297, 76.8343]
}

declare global {
  interface Window {
    L: any
  }
}

function CrimeLeafletMap({ 
  incidents, 
  selectedDistrict,
  timeOfDayFilter
}: { 
  incidents: KspIncident[]
  selectedDistrict: string
  timeOfDayFilter: 'all' | 'day' | 'night'
}) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)

  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapLoaded || !window.L) return

    const container = document.getElementById('ksp-map-container')
    if (!container) return
    container.innerHTML = '<div id="ksp-actual-map" style="height: 100%; width: 100%; border-radius: 12px;"></div>'

    const L = window.L
    
    // Set view based on selected district or default to state center (Karnataka)
    const defaultCoords: [number, number] = DISTRICT_COORDS[selectedDistrict] || [12.9716, 77.5946]
    const zoomLevel = selectedDistrict === 'all' ? 7 : 12
    const map = L.map('ksp-actual-map').setView(defaultCoords, zoomLevel)
    setMapInstance(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Filter and plot crime hotspots
    incidents.forEach(inc => {
      // Time filters
      const hour = new Date(inc.date_time).getUTCHours()
      const isNight = hour < 6 || hour >= 18 // Night is 6 PM to 6 AM
      if (timeOfDayFilter === 'day' && isNight) return
      if (timeOfDayFilter === 'night' && !isNight) return

      const coords: [number, number] = [inc.latitude, inc.longitude]
      
      // Determine hotspot indicator color based on priority
      let color = '#3b82f6' // Blue for low/medium
      if (inc.priority === 'urgent') {
        color = '#ef4444' // Red
      } else if (inc.priority === 'high') {
        color = '#f97316' // Orange
      }

      // Pulse circle for high threat zones
      const circle = L.circle(coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.5,
        radius: inc.priority === 'urgent' ? 300 : 180
      }).addTo(map)

      circle.bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 180px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            🚨 ${inc.case_number} (${inc.category.toUpperCase()})
          </h4>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #64748b;">
            <span>Location: <strong>${inc.location}, ${inc.district}</strong></span>
            <span>MO: <i>${inc.modus_operandi}</i></span>
            <span style="color: ${color}; font-weight: 600;">Priority: ${inc.priority.toUpperCase()}</span>
            <span>Risk Index Score: <strong>${inc.risk_score}</strong></span>
          </div>
        </div>
      `)
    })

    return () => {
      map.remove()
    }
  }, [mapLoaded, incidents, selectedDistrict, timeOfDayFilter])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '400px' }}>
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
          Loading Map overlays...
        </div>
      )}
      <div id="ksp-map-container" style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon, color }: { title: string, value: any, subtitle: string, icon: any, color: string }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ background: `${color}15`, color: color, padding: '12px', borderRadius: '10px' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>{value}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{subtitle}</div>
      </div>
    </div>
  )
}

export default function CrimeIntelligencePage() {
  const supabase = createClient()
  const [incidents, setIncidents] = useState<KspIncident[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [districtFilter, setDistrictFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'day' | 'night'>('all')

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('ksp_incidents')
          .select('*')
          .order('date_time', { ascending: false })
        
        if (!error && data && data.length > 0) {
          setIncidents(data)
        } else {
          setIncidents(MOCK_INCIDENTS)
        }
      } catch {
        setIncidents(MOCK_INCIDENTS)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filters logic
  const filtered = incidents.filter(inc => {
    const matchesDistrict = districtFilter === 'all' || inc.district === districtFilter
    const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter
    return matchesDistrict && matchesCategory
  })

  // Pulsing alerts for spikes (Emerging Trend alert check)
  const categoryCounts = filtered.reduce((acc, current) => {
    acc[current.category] = (acc[current.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const spikes = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= 2)
    .map(([cat, count]) => ({ category: cat, count }))

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Title strip */}
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(17, 24, 39, 0.15)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#f87171', marginBottom: '8px' }}>
                <Radio size={12} className="animate-pulse" />
                KSP State Crime Records Bureau (SCRB)
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '32px', color: '#ffffff' }}>
                Crime Hotspots &amp; Geospatial Intelligence
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                Real-time geospatial drill-downs, spatiotemporal clusters, and critical alert matrices.
              </p>
            </div>
          </div>
        </div>

        {/* Pulsing alerts ticker panel if there are emerging category spikes */}
        {spikes.length > 0 && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#b91c1c'
          }}>
            <Flame size={20} className="animate-bounce" />
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              Emerging Trend Warning: Spikes detected in categories (
              {spikes.map(s => `${s.category.toUpperCase()}: ${s.count} cases`).join(', ')}
              ) in selected filters!
            </div>
            <span style={{
              marginLeft: 'auto',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              animation: 'pulse 1.5s infinite'
            }}>RED-ZONE PULSING</span>
          </div>
        )}

        {/* Filters Strip */}
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

          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Districts</option>
            {Object.keys(DISTRICT_COORDS).map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            <option value="theft">Theft</option>
            <option value="cybercrime">Cybercrime</option>
            <option value="narcotics">Narcotics</option>
            <option value="robbery">Robbery</option>
            <option value="assault">Assault</option>
            <option value="murder">Murder</option>
          </select>

          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {(['all', 'day', 'night'] as const).map(timeVal => (
              <button
                key={timeVal}
                onClick={() => setTimeOfDayFilter(timeVal)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: timeOfDayFilter === timeVal ? '#ffffff' : 'transparent',
                  color: timeOfDayFilter === timeVal ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: timeOfDayFilter === timeVal ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {timeVal === 'all' ? 'Anytime' : timeVal === 'day' ? 'Day (6AM - 6PM)' : 'Night (6PM - 6AM)'}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <KpiCard
            title="Total Incidents"
            value={filtered.length}
            subtitle="Filtered cases"
            color="#3b82f6"
            icon={<Layers size={20} />}
          />
          <KpiCard
            title="Urgent/High Threats"
            value={filtered.filter(i => i.priority === 'urgent' || i.priority === 'high').length}
            subtitle="Requires dispatch"
            color="#ef4444"
            icon={<ShieldAlert size={20} />}
          />
          <KpiCard
            title="Crime Hotspots"
            value={Array.from(new Set(filtered.map(i => i.location))).length}
            subtitle="Unique critical zones"
            color="#f97316"
            icon={<Flame size={20} />}
          />
          <KpiCard
            title="Avg Risk Index"
            value={filtered.length > 0 ? (filtered.reduce((sum, current) => sum + current.risk_score, 0) / filtered.length).toFixed(1) : 0.0}
            subtitle="Out of 100 max"
            color="#8b5cf6"
            icon={<Compass size={20} />}
          />
        </div>

        {/* Map Layout Panel */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          marginBottom: '32px'
        }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '4px' }}>
            Geospatial Spatiotemporal Overlays
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Interactive rendering representing spatiotemporal threat clusters across jurisdictions.
          </p>
          <div style={{ height: '420px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
            <CrimeLeafletMap 
              incidents={filtered} 
              selectedDistrict={districtFilter}
              timeOfDayFilter={timeOfDayFilter}
            />
          </div>
        </div>

        {/* Police Station details listing */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>
              Jurisdiction / Station Metrics
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 24px' }}>Case Number</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Station</th>
                <th style={{ padding: '12px 16px' }}>District</th>
                <th style={{ padding: '12px 16px' }}>Time of Day</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Threat Index</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                  <td style={{ padding: '14px 24px', fontWeight: 700, color: '#0f172a' }}>{inc.case_number}</td>
                  <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>{inc.category}</td>
                  <td style={{ padding: '14px 16px' }}>{inc.police_station}</td>
                  <td style={{ padding: '14px 16px' }}>{inc.district}</td>
                  <td style={{ padding: '14px 16px' }}>{new Date(inc.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 600 }}>{inc.risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
