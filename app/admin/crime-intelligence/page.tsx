'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ShieldAlert, MapPin, Clock, Search, RefreshCw, 
  Layers, Compass, Flame, Radio, AlertTriangle
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident, MOCK_PEOPLE, MOCK_CONNECTIONS, KspPerson } from '@/lib/ksp/mockData'
import { runStDbscan, detectMoSeriesInCluster, analyzeTemporalTrends, detectContextualAnomalies } from '@/lib/ksp/clustering'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Bengaluru Urban": [12.9716, 77.5946],
  "Mysuru": [12.2958, 76.6394],
  "Hubballi-Dharwad": [15.3524, 75.1381],
  "Belagavi": [15.8497, 74.4977],
  "Mangaluru": [12.9141, 74.8560],
  "Mandya": [12.5218, 76.8973],
  "Kalaburagi": [17.3297, 76.8343]
}

const KARNATAKA_BORDER: [number, number][] = [
  [18.4735, 77.3484], // Bidar North
  [17.8422, 77.5342],
  [17.4323, 77.4989],
  [17.1624, 77.3821], // Yadgir
  [16.7915, 77.3241],
  [16.1824, 77.3489], // Raichur
  [15.8234, 76.9213],
  [15.2234, 76.3812],
  [15.0892, 76.8423], // Ballari
  [14.2812, 76.8012], // Chitradurga
  [13.8213, 77.2123], // Tumakuru
  [13.8423, 78.2812], // Kolar
  [12.9812, 78.4892], // East extreme
  [12.7812, 77.9892],
  [12.3812, 77.7892],
  [11.9213, 77.2123],
  [11.5234, 76.8892], // Southern tip
  [12.0234, 76.1812], // Kodagu
  [12.4892, 75.3123], // Mangaluru / coastal
  [13.2234, 74.7213], // Udupi
  [14.0234, 74.4123], // Karwar
  [14.9234, 73.9892], // Goa border
  [15.5892, 73.8123], // Belagavi border
  [15.9892, 74.2123],
  [16.7892, 74.8123], // Maharashtra border
  [17.2892, 75.8123],
  [17.8892, 76.3892],
  [18.4735, 77.3484] // Close loop
]

function normalizeDistrictName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (normalized === 'bangalore' || normalized === 'bangalore urban' || normalized === 'bengaluru urban') return 'Bengaluru Urban'
  if (normalized === 'belgaum' || normalized === 'belagavi') return 'Belagavi'
  if (normalized === 'gulbarga' || normalized === 'kalaburagi') return 'Kalaburagi'
  if (normalized === 'mysore' || normalized === 'mysuru') return 'Mysuru'
  if (normalized === 'dharwad' || normalized === 'hubli-dharwad' || normalized === 'hubballi-dharwad') return 'Hubballi-Dharwad'
  if (normalized === 'dakshina kannada' || normalized === 'mangalore' || normalized === 'mangaluru') return 'Mangaluru'
  if (normalized === 'mandya') return 'Mandya'
  return name
}

declare global {
  interface Window {
    L: any
  }
}

function CrimeLeafletMap({ 
  incidents, 
  selectedDistrict,
  timeOfDayFilter,
  onSelectDistrict,
  onSelectIncident
}: { 
  incidents: KspIncident[]
  selectedDistrict: string
  timeOfDayFilter: 'all' | 'day' | 'night'
  onSelectDistrict: (district: string) => void
  onSelectIncident?: (incidentId: string) => void
}) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)

  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
    } else {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    }

    fetch('https://raw.githubusercontent.com/shuklaneerajdev/IndiaStateTopojsonFiles/master/Karnataka.geojson')
      .then(res => res.json())
      .then(data => setGeoJsonData(data))
      .catch(err => console.error('Failed to load Karnataka GeoJSON:', err))
  }, [])

  useEffect(() => {
    if (!mapLoaded || !window.L || !geoJsonData) return

    const container = document.getElementById('ksp-map-container')
    if (!container) return
    container.innerHTML = '<div id="ksp-actual-map" style="height: 100%; width: 100%; border-radius: 16px;"></div>'

    const L = window.L
    
    // Center on state of Karnataka by default, otherwise zoom in on the specific district
    const defaultCoords: [number, number] = selectedDistrict === 'all' 
      ? [15.3173, 75.7139] 
      : (DISTRICT_COORDS[selectedDistrict] || [12.9716, 77.5946])
    const zoomLevel = selectedDistrict === 'all' ? 7 : 11
    const map = L.map('ksp-actual-map').setView(defaultCoords, zoomLevel)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Calculate active crime counts per district from incidents
    const crimeCountsPerDistrict = incidents.reduce((acc, inc) => {
      const normName = normalizeDistrictName(inc.district)
      acc[normName] = (acc[normName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Draw high-fidelity district boundaries from GeoJSON
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      filter: (feature: any) => {
        if (selectedDistrict === 'all') return true
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        return normalizeDistrictName(selectedDistrict) === normalizedName
      },
      style: (feature: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const count = crimeCountsPerDistrict[normalizedName] || 0
        
        let fillClr = '#7B8F65' // 0 cases - vibrant green
        if (count >= 4) fillClr = '#ef4444' // Very High - Red
        else if (count === 3) fillClr = '#f97316' // High - Orange
        else if (count === 2) fillClr = '#eab308' // Medium - Yellow
        else if (count === 1) fillClr = '#6D9998' // Low - Dark green
        
        return {
          color: '#6D9998', // Green border
          weight: 1.5,
          fillColor: fillClr,
          fillOpacity: 0.4
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const count = crimeCountsPerDistrict[normalizedName] || 0
        
        layer.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e)
          onSelectDistrict(normalizedName)
        })

        layer.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 140px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
              📍 ${dName} Limit
            </h4>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
              <span>Active Crimes: <strong>${count} cases</strong></span>
            </div>
          </div>
        `)
      }
    }).addTo(map)

    // Fit bounds of the GeoJSON layer to fit the state/district stretch perfectly in vertical viewport
    try {
      if (geoJsonLayer.getLayers().length > 0) {
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] })
      }
    } catch (err) {
      console.error('Failed to fit bounds:', err)
    }

    // Run ST-DBSCAN spatiotemporal clustering on input incidents
    const clusterPoints = incidents.map((inc, index) => ({
      id: inc.id,
      latitude: inc.latitude,
      longitude: inc.longitude,
      timeMs: new Date(inc.date_time).getTime(),
      originalIndex: index
    }))
    const clusters = runStDbscan(clusterPoints, 15, 7 * 24 * 60 * 60 * 1000, 2)

    // Plot clusters as shaded circles with dashed borders
    clusters.forEach(c => {
      const clusterSeries = detectMoSeriesInCluster(c.points, incidents, 0.35)
      const seriesText = clusterSeries.length > 0
        ? clusterSeries.map(s => `• Series #${s.seriesId}: ${Math.round(s.averageSimilarity * 100)}% similarity (${s.points.length} cases)`).join('<br/>')
        : 'No repetitive MO series detected'

      L.circle([c.centerLat, c.centerLon], {
        color: '#8b5cf6', // Purple for clusters
        fillColor: '#8b5cf6',
        fillOpacity: 0.15,
        radius: c.radiusKm * 1000,
        dashArray: '6, 6',
        weight: 2
      }).addTo(map).bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 220px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #6d28d9; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
            🌌 Spatiotemporal Cluster #${c.clusterId}
          </h4>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
            <span>Incidents: <strong>${c.points.length} cases</strong></span>
            <span>Span Radius: <strong>${c.radiusKm.toFixed(2)} km</strong></span>
            <span>Duration: <strong>${new Date(c.startTime).toLocaleDateString()} - ${new Date(c.endTime).toLocaleDateString()}</strong></span>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #dadad3;">
              <span style="font-weight: 700; color: #6d28d9;">Detected MO Series:</span><br/>
              <span style="color: #262622; line-height: 1.4; display: block; margin-top: 2px;">${seriesText}</span>
            </div>
          </div>
        </div>
      `)
    })

    // Filter and plot crime hotspots
    incidents.forEach(inc => {
      const hour = new Date(inc.date_time).getUTCHours()
      const isNight = hour < 6 || hour >= 18
      if (timeOfDayFilter === 'day' && isNight) return
      if (timeOfDayFilter === 'night' && !isNight) return

      const coords: [number, number] = [inc.latitude, inc.longitude]
      let color = '#e60023'
      if (inc.priority === 'urgent') color = '#ef4444'
      else if (inc.priority === 'high') color = '#f97316'

      const circleObj = L.circle(coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.5,
        radius: inc.priority === 'urgent' ? 300 : 180
      }).addTo(map)

      if (onSelectIncident) {
        circleObj.on('click', () => {
          onSelectIncident(inc.id)
        })
      }

      circleObj.bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 180px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
            🚨 ${inc.case_number} (${inc.category.toUpperCase()})
          </h4>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
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
  }, [mapLoaded, geoJsonData, incidents, selectedDistrict, timeOfDayFilter, onSelectIncident])

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {(!mapLoaded || !geoJsonData) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#f6f6f3',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#262622',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 10
        }}>
          Loading Map overlays...
        </div>
      )}
      <div id="ksp-map-container" style={{ flex: 1, width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
        background: '#ffffff',
        border: '1px solid #dadad3',
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '140px',
        fontFamily: FONT_SANS
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#262622', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Crime Density
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Very High', color: '#ef4444' },
            { label: 'High', color: '#f97316' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#6D9998' },
            { label: 'Very Low', color: '#7B8F65' }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, color: '#262622' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        background: '#ffffff',
        border: '1px solid #dadad3',
        borderRadius: '16px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: FONT_SANS,
        fontSize: '11px',
        color: '#262622',
        fontWeight: 600
      }}>
        <Clock size={12} />
        <span>Last Updated Today, 08:30 AM</span>
      </div>
    </div>
  )
}


function KpiCard({ title, value, subtitle, icon, color }: { title: string, value: any, subtitle: string, icon: any, color: string }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dadad3',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ background: `${color}15`, color: color, padding: '12px', borderRadius: '16px' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#262622', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#000000', margin: '2px 0' }}>{value}</div>
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
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

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

  // Dynamic calculations for the right-side detail panel
  const districtIncidents = districtFilter === 'all' 
    ? filtered 
    : filtered.filter(i => normalizeDistrictName(i.district) === normalizeDistrictName(districtFilter))
    
  const totalCases = districtIncidents.length
  const urgentCases = districtIncidents.filter(i => i.priority === 'urgent' || i.priority === 'high').length
  const avgRisk = totalCases > 0 
    ? Math.round(districtIncidents.reduce((sum, i) => sum + i.risk_score, 0) / totalCases) 
    : 0

  // Category counts and percent mapping
  const categoryCountsMap = districtIncidents.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const colorsMap: Record<string, string> = {
    theft: '#7B8F65',
    cybercrime: '#f59e0b',
    narcotics: '#ef4444',
    robbery: '#e60023',
    assault: '#8b5cf6',
    murder: '#ec4899'
  }

  const categoryDistribution = Object.entries(colorsMap).map(([catName, color]) => {
    const count = categoryCountsMap[catName] || 0
    const pct = totalCases > 0 ? Math.round((count / totalCases) * 100) : 0
    return { name: catName, count, pct, color }
  }).sort((a, b) => b.count - a.count)

  // Status/threat badge evaluation
  let statusLabel = 'Low Threat'
  let badgeBg = '#dcfce7'
  let badgeText = '#6D9998'
  if (totalCases >= 4) {
    statusLabel = 'Critical'
    badgeBg = '#fee2e2'
    badgeText = '#b91c1c'
  } else if (totalCases === 3) {
    statusLabel = 'High threat'
    badgeBg = '#ffedd5'
    badgeText = '#c2410c'
  } else if (totalCases === 2) {
    statusLabel = 'Medium'
    badgeBg = '#fef3c7'
    badgeText = '#d97706'
  }

  // Primary MO
  const dominantInc = districtIncidents.sort((a,b) => b.risk_score - a.risk_score)[0]
  const primaryMo = dominantInc ? dominantInc.modus_operandi : 'No active incident MO logs found for selected filters.'

  const districtStats = {
    total: totalCases,
    urgent: urgentCases,
    avgRisk,
    primaryMo,
    categories: categoryDistribution,
    statusLabel,
    badgeBg,
    badgeText
  }

  // MO series calculation in currently filtered scope
  const clusterPointsForSeries = filtered.map((inc, index) => ({
    id: inc.id,
    latitude: inc.latitude,
    longitude: inc.longitude,
    timeMs: new Date(inc.date_time).getTime(),
    originalIndex: index
  }))
  const activeClusters = runStDbscan(clusterPointsForSeries, 15, 7 * 24 * 60 * 60 * 1000, 2)
  
  // For each cluster, detect MO series
  const detectedSeries = activeClusters.flatMap(c => {
    const seriesList = detectMoSeriesInCluster(c.points, filtered, 0.35)
    return seriesList.map(s => ({
      ...s,
      clusterId: c.clusterId
    }))
  })

  // Calculate temporal autocorrelation & rhythms
  const temporalTrends = analyzeTemporalTrends(districtIncidents)

  // Run Isolation Forest anomaly detector on district incidents
  const anomalyResults = detectContextualAnomalies(districtIncidents, 20, 0.58)
  const anomaliesCount = anomalyResults.filter(r => r.isAnomaly).length

  // Pulsing alerts for spikes (Emerging Trend alert check)
  const categoryCounts = filtered.reduce((acc, current) => {
    acc[current.category] = (acc[current.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const spikes = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= 2)
    .map(([cat, count]) => ({ category: cat, count }))

  // Category cards data for top selector
  const categoryCardsData = [
    {
      id: 'theft',
      label: 'Theft Crimes',
      icon: ShieldAlert,
      color: '#6D9998',
      count: incidents.filter(i => i.category === 'theft').length
    },
    {
      id: 'cybercrime',
      label: 'Cybercrimes',
      icon: Radio,
      color: '#d97706',
      count: incidents.filter(i => i.category === 'cybercrime').length
    },
    {
      id: 'narcotics',
      label: 'Narcotics Cases',
      icon: Flame,
      color: '#dc2626',
      count: incidents.filter(i => i.category === 'narcotics').length
    },
    {
      id: 'robbery',
      label: 'Robbery Issues',
      icon: AlertTriangle,
      color: '#e60023',
      count: incidents.filter(i => i.category === 'robbery').length
    },
    {
      id: 'all',
      label: 'All Crimes',
      icon: Layers,
      color: '#262622',
      count: incidents.length
    }
  ]

  const categoryInfo = categoryCardsData.find(c => c.id === categoryFilter) || categoryCardsData[4]
  const OverviewIcon = categoryInfo.icon

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId)
  const associatedConnections = selectedIncidentId 
    ? MOCK_CONNECTIONS.filter(conn => conn.incident_id === selectedIncidentId)
    : []
  const associatedPeople = associatedConnections.map(conn => {
    const person = MOCK_PEOPLE.find(p => p.id === conn.person_id)
    return person ? { ...person, role: conn.role } : null
  }).filter(Boolean) as (KspPerson & { role: string })[]

  return (
    <main style={{ minHeight: '100vh', background: '#f6f6f3', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <style>{`
        .hover-row:hover {
          background-color: #f6f6f3 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '28px', color: '#000000' }}>
              Crime-Specific Hotspots
            </h1>
            <p style={{ fontSize: '14px', color: '#262622', marginTop: '4px' }}>
              Select a crime type to view complaints density by district
            </p>
          </div>
          
          {/* District Selector Dropdown (Styled like the mockup top-bar dropdown) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#262622' }}>District:</span>
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '0 32px 0 16px',
                borderRadius: '16px',
                border: '1px solid #dadad3',
                fontSize: '14px',
                fontWeight: 700,
                color: '#000000',
                background: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                outline: 'none',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230f172a\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px'
              }}
            >
              <option value="all">All Karnataka Districts</option>
              {Object.keys(DISTRICT_COORDS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Horizontal Category Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {categoryCardsData.map(card => {
            const isSelected = categoryFilter === card.id
            const IconComponent = card.icon
            return (
              <button
                key={card.id}
                onClick={() => setCategoryFilter(card.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? `2.5px solid ${card.color}` : '1.5px solid #dadad3',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isSelected ? `0 4px 12px ${card.color}15` : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 150ms ease-in-out',
                  outline: 'none'
                }}
              >
                <div style={{
                  background: `${card.color}12`,
                  color: card.color,
                  padding: '10px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComponent size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000000' }}>{card.label}</div>
                  <div style={{ fontSize: '12px', color: '#262622', marginTop: '2px', fontWeight: 500 }}>
                    {card.count} {card.count === 1 ? 'incident' : 'incidents'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Pulsing alerts ticker panel if there are emerging category spikes */}
        {spikes.length > 0 && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
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

        {/* Map & Detail Panel Grid Layout */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '16px',
          width: '100%'
        }}>
          
          {/* Left Side: Map Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            flex: '2 1 600px',
            minWidth: '320px'
          }}>
            <div style={{ 
              flex: 1, 
              width: '100%', 
              background: '#f6f6f3', 
              borderRadius: '16px', 
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              border: '1px solid #dadad3',
              position: 'relative',
              minHeight: '760px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CrimeLeafletMap 
                incidents={filtered} 
                selectedDistrict={districtFilter}
                timeOfDayFilter={timeOfDayFilter}
                onSelectDistrict={setDistrictFilter}
                onSelectIncident={setSelectedIncidentId}
              />
            </div>
          </div>

          {/* Right Side: Details Panel */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: '1 1 320px',
            minWidth: '300px'
          }}>
            {/* Detail Panel Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid #dadad3', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '20px', color: '#000000' }}>
                  {districtFilter === 'all' ? 'Karnataka State' : districtFilter}
                </h3>
                <span style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>JURISDICTION OVERVIEW</span>
              </div>
              <span style={{
                background: districtStats.badgeBg,
                color: districtStats.badgeText,
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                {districtStats.statusLabel}
              </span>
            </div>

            {/* Sub-Header overview category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: categoryInfo.color, fontSize: '13px', fontWeight: 700, margin: '-8px 0 4px' }}>
              <OverviewIcon size={16} />
              <span>{categoryInfo.label} Overview</span>
            </div>

            {/* 3-Column Stats Grid */}
            <div style={{
              display: 'flex',
              border: '1px solid #dadad3',
              borderRadius: '16px',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ flex: 1, padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #dadad3' }}>
                <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Total Cases</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#000000', margin: '4px 0' }}>{districtStats.total}</div>
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>↑ 12% vs last wk</div>
              </div>
              <div style={{ flex: 1, padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #dadad3' }}>
                <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Solved</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#6D9998', margin: '4px 0' }}>{Math.round(districtStats.total * 0.6)}</div>
                <div style={{ fontSize: '10px', color: '#262622', fontWeight: 500 }}>60% solved</div>
              </div>
              <div style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Active</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c', margin: '4px 0' }}>{districtStats.total - Math.round(districtStats.total * 0.6)}</div>
                <div style={{ fontSize: '10px', color: '#262622', fontWeight: 500 }}>40% active</div>
              </div>
            </div>

            {/* 2-Column Stats Row */}
            <div style={{
              display: 'flex',
              gap: '12px',
              width: '100%'
            }}>
              <div style={{
                flex: 1,
                border: '1px solid #dadad3',
                borderRadius: '16px',
                padding: '10px 12px',
                background: '#f6f6f3',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#262622', fontWeight: 600 }}>
                  <Clock size={12} /> Avg. Response
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#000000' }}>18m</div>
                <span style={{ fontSize: '10px', color: '#6D9998', fontWeight: 600 }}>↓ 3m from yesterday</span>
              </div>
              <div style={{
                flex: 1,
                border: '1px solid #dadad3',
                borderRadius: '16px',
                padding: '10px 12px',
                background: '#f6f6f3',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#262622', fontWeight: 600 }}>
                  <ShieldAlert size={12} /> Escalations
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{districtStats.urgent}</div>
                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>↑ 1 from yesterday</span>
              </div>
            </div>

            {/* Category distribution list */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top Sub-Issues
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {districtStats.categories.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#262622', width: '90px', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#f6f6f3', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#262622', width: '50px', textAlign: 'right' }}>
                      {cat.count} ({cat.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>


            {/* Temporal Autocorrelation & Rhythms */}
            <div style={{ borderTop: '1px solid #dadad3', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Temporal Autocorrelation &amp; Trends
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#4b5563' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#262622', minWidth: '85px' }}>Weekly Pattern:</span>
                  <span>{temporalTrends.weeklyPattern}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#262622', minWidth: '85px' }}>Diurnal Rhythm:</span>
                  <span>{temporalTrends.diurnalPattern}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 700, color: '#262622' }}>Cyclical Rhythms:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#f6f6f3', padding: '6px 10px', borderRadius: '6px', border: '1px solid #dadad3', marginTop: '2px' }}>
                    {temporalTrends.cyclicalRhythms.map((rhythm, rIdx) => (
                      <div key={rIdx} style={{ color: '#0369a1', fontWeight: 600 }}>• {rhythm}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>


            {/* Contextual Anomaly Detection */}
            <div style={{ borderTop: '1px solid #dadad3', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  Contextual Anomalies
                </h4>
                {anomaliesCount > 0 ? (
                  <span style={{ fontSize: '10px', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '16px', fontWeight: 700 }}>
                    {anomaliesCount} flagged
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#6D9998', padding: '2px 8px', borderRadius: '16px', fontWeight: 700 }}>
                    Nominal
                  </span>
                )}
              </div>
              
              {/* List Anomalous Incidents */}
              {anomaliesCount === 0 ? (
                <div style={{ fontSize: '12px', color: '#262622', background: '#f6f6f3', padding: '10px 12px', borderRadius: '16px', border: '1px dashed #dadad3', textAlign: 'center' }}>
                  Isolation Forest: All cases nominal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {anomalyResults.filter(r => r.isAnomaly).map((r, idx) => {
                    const matchedInc = districtIncidents.find(i => i.id === r.id)
                    if (!matchedInc) return null
                    return (
                      <div key={idx} style={{
                        background: '#fffafb',
                        border: '1px solid #ffe4e6',
                        borderRadius: '16px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#be123c' }}>{matchedInc.case_number}</span>
                          <span style={{ fontSize: '10px', color: '#be123c', fontWeight: 700 }}>
                            Score: {r.score}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.4' }}>
                          <strong>Anomaly Reasons:</strong>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '16px', listStyleType: 'disc' }}>
                            {r.reasons.map((reason, rIdx) => (
                              <li key={rIdx} style={{ color: '#e11d48' }}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Spatiotemporal Series Analysis */}
            <div style={{ borderTop: '1px solid #dadad3', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Detected MO Series
              </h4>
              {detectedSeries.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#262622', background: '#f6f6f3', padding: '10px 12px', borderRadius: '16px', border: '1px dashed #dadad3', textAlign: 'center' }}>
                  No serial MO patterns detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {detectedSeries.map((s, idx) => (
                    <div key={idx} style={{
                      background: '#fcfaff',
                      border: '1px solid #e8dbff',
                      borderRadius: '16px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6d28d9' }}>Series #{s.seriesId} (Cluster #{s.clusterId})</span>
                        <span style={{ fontSize: '10px', background: '#f3e8ff', color: '#7c3aed', padding: '1px 6px', borderRadius: '16px', fontWeight: 700 }}>
                          {Math.round(s.averageSimilarity * 100)}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.4' }}>
                        <strong>Pattern:</strong> <span style={{ fontStyle: 'italic' }}>{s.commonPattern}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                        Linked Cases: <strong>{s.points.length} incident records</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Button action */}
            <button
              onClick={() => {
                const logsTable = document.getElementById('station-logs-section')
                if (logsTable) {
                  logsTable.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              style={{
                marginTop: 'auto',
                width: '100%',
                height: '44px',
                background: '#e60023',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 120ms',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e60023'}
              onMouseLeave={e => e.currentTarget.style.background = '#e60023'}
            >
              View All Complaints &rarr;
            </button>
          </div>
        </div>

        {/* Footer Actions Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '8px',
          marginBottom: '32px',
          width: '100%'
        }}>
          {/* Left: Tip Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#eff6ff',
            color: '#1e3a8a',
            padding: '10px 16px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <AlertTriangle size={14} style={{ color: '#e60023' }} />
            <span>Tip: Click on any district boundary to view detailed complaints and trends</span>
          </div>

          {/* Right: Download Button */}
          <button
            onClick={() => alert('Feature: Downloading PDF crime intelligence report...')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #dadad3',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#262622',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 120ms'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f6f6f3'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <RefreshCw size={14} />
            <span>Download Heatmap</span>
          </button>
        </div>

        {/* Police Station details listing */}
        <div id="station-logs-section" style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dadad3',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadad3' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000' }}>
              Jurisdiction / Station Metrics
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f6f6f3', color: '#262622', fontWeight: 600, borderBottom: '1px solid #dadad3' }}>
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
                <tr 
                  key={inc.id} 
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className="hover-row"
                  style={{ 
                    borderBottom: '1px solid #f6f6f3', 
                    color: '#262622',
                    cursor: 'pointer',
                    transition: 'background 120ms ease'
                  }}
                >
                  <td style={{ padding: '14px 24px', fontWeight: 700, color: '#000000' }}>{inc.case_number}</td>
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

      {selectedIncidentId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Modal Container */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '840px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #dadad3',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            animation: 'scaleUp 250ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{
              background: '#000000',
              color: '#ffffff',
              padding: '20px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  CRIME INTELLIGENCE CASE FILE
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '2px 0 0', fontFamily: FONT_DISPLAY }}>
                  Case: {selectedIncident?.case_number}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedIncidentId(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 150ms'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Top Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', background: '#f6f6f3', padding: '16px', borderRadius: '16px', border: '1px solid #dadad3' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600, textTransform: 'uppercase' }}>Police Station</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>{selectedIncident?.police_station}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600, textTransform: 'uppercase' }}>Date &amp; Time</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                    {selectedIncident ? new Date(selectedIncident.date_time).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#262622', marginTop: '1px' }}>
                      {selectedIncident ? new Date(selectedIncident.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600, textTransform: 'uppercase' }}>Location &amp; District</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>{selectedIncident?.location}</div>
                  <div style={{ fontSize: '11px', color: '#262622', fontWeight: 500 }}>{selectedIncident?.district}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600, textTransform: 'uppercase' }}>Threat / Priority</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      background: selectedIncident?.priority === 'urgent' ? '#fee2e2' : selectedIncident?.priority === 'high' ? '#ffedd5' : '#fef3c7',
                      color: selectedIncident?.priority === 'urgent' ? '#b91c1c' : selectedIncident?.priority === 'high' ? '#c2410c' : '#d97706',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '16px',
                      textTransform: 'uppercase'
                    }}>
                      {selectedIncident?.priority}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#000000' }}>Score: {selectedIncident?.risk_score}</span>
                  </div>
                </div>
              </div>

              {/* Main Split Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '28px', flexWrap: 'wrap' }}>
                
                {/* Left side: Case Narrative */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#262622', borderBottom: '2px solid #dadad3', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📜 Case History / Description
                    </h3>
                    <p style={{ fontSize: '14px', color: '#262622', lineHeight: '1.6', background: '#f6f6f3', padding: '16px', borderRadius: '16px', border: '1.5px solid #dadad3', margin: 0 }}>
                      {selectedIncident?.description}
                    </p>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#262622', borderBottom: '2px solid #dadad3', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚙️ Modus Operandi Details
                    </h3>
                    <p style={{ fontSize: '14px', color: '#262622', lineHeight: '1.6', fontStyle: 'italic', background: '#fcfaff', padding: '16px', borderRadius: '16px', border: '1.5px solid #e8dbff', margin: 0 }}>
                      {selectedIncident?.modus_operandi}
                    </p>
                  </div>
                </div>

                {/* Right side: Associated entities & Socio-economic context */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Suspects / Victims List */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#262622', borderBottom: '2px solid #dadad3', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      👥 Associated Entities
                    </h3>
                    {associatedPeople.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#262622', padding: '12px', background: '#f6f6f3', borderRadius: '16px', border: '1.5px dashed #dadad3', textAlign: 'center' }}>
                        No suspects or victims registered in system connections.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {associatedPeople.map((person, pIdx) => {
                          const isSuspect = person.role === 'primary_suspect' || person.role === 'accomplice'
                          return (
                            <div key={pIdx} style={{
                              background: isSuspect ? '#fffafb' : '#f0f9ff',
                              border: isSuspect ? '1.5px solid #ffe4e6' : '1.5px solid #e0f2fe',
                              padding: '12px',
                              borderRadius: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: isSuspect ? '#be123c' : '#0369a1' }}>
                                  {person.name}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: isSuspect ? '#ffe4e6' : '#e0f2fe',
                                  color: isSuspect ? '#be123c' : '#0369a1',
                                  padding: '1px 6px',
                                  borderRadius: '16px',
                                  textTransform: 'uppercase'
                                }}>
                                  {person.role.replace('_', ' ')}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#262622' }}>
                                Age: {person.demographics.age} | Gender: {person.demographics.gender}
                              </div>
                              <div style={{ fontSize: '11px', color: '#262622', fontStyle: 'italic' }}>
                                Occupation: {person.demographics.occupation}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Socio-Economic Context */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#262622', borderBottom: '2px solid #dadad3', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📊 Demographics Context
                    </h3>
                    <div style={{
                      background: '#f6f6f3',
                      border: '1.5px solid #dadad3',
                      padding: '12px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#262622', fontWeight: 600 }}>Urbanization Rate:</span>
                        <span style={{ fontWeight: 700, color: '#000000', textTransform: 'capitalize' }}>
                          {selectedIncident?.socio_economic_factors?.urbanization}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#262622', fontWeight: 600 }}>Population Density:</span>
                        <span style={{ fontWeight: 700, color: '#000000', textTransform: 'capitalize' }}>
                          {selectedIncident?.socio_economic_factors?.density}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#262622', fontWeight: 600 }}>Poverty Index:</span>
                        <span style={{ fontWeight: 700, color: '#000000', textTransform: 'capitalize' }}>
                          {selectedIncident?.socio_economic_factors?.poverty_index}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Footer Panel */}
            <div style={{
              background: '#f6f6f3',
              borderTop: '1px solid #dadad3',
              padding: '16px 28px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setSelectedIncidentId(null)}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  background: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 120ms'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#262622'}
                onMouseLeave={e => e.currentTarget.style.background = '#000000'}
              >
                Close File
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  )
}
