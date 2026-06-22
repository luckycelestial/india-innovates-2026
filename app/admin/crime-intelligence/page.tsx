'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { 
  ShieldAlert, MapPin, Clock, Search, RefreshCw, 
  Layers, Compass, Flame, Radio, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident, MOCK_PEOPLE, MOCK_CONNECTIONS, KspPerson } from '@/lib/ksp/mockData'
import { runStDbscan, detectMoSeriesInCluster, analyzeTemporalTrends, detectContextualAnomalies } from '@/lib/ksp/clustering'
import { normalizeDistrictName } from '@/lib/utils/district'
import CrimeLeafletMap from '@/components/admin/CrimeLeafletMap'
import CrimeKpiCard from '@/components/admin/CrimeKpiCard'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

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
  [15.9892, 74.2123],
  [16.7892, 74.8123], // Maharashtra border
  [17.2892, 75.8123],
  [17.8892, 76.3892],
  [18.4735, 77.3484] // Close loop
]

declare global {
  interface Window {
    L: any
  }
}

const getAqiStatus = (aqi: number) => {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Satisfactory'
  if (aqi <= 200) return 'Moderate'
  return 'Poor'
}

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const minStr = minutes < 10 ? '0' + minutes : minutes
  return `${hours.toString().padStart(2, '0')}:${minStr} ${ampm}`
}

const formatDate = (dateStr: string | number): string => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateLong = (dateStr: string | number): string => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}


function CrimeIntelligenceContent() {
  const searchParams = useSearchParams()
  const heatmapType = searchParams.get('type') || 'aqi'
  
  const [incidents, setIncidents] = useState<KspIncident[]>(MOCK_INCIDENTS)
  const [loading, setLoading] = useState(false)
  const [aqiData, setAqiData] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [trafficData, setTrafficData] = useState<any[]>([])
  const [trafficHistory, setTrafficHistory] = useState<any[]>([])
  const [dataSourceType, setDataSourceType] = useState<'actual' | 'predicted'>('actual')
  const [mlPredictions, setMlPredictions] = useState<any>({ aqi_forecast: [], traffic_congestion: [] })

  useEffect(() => {
    fetch('/api/districts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDistricts(data)
        }
      })
      .catch(err => console.error('Failed to fetch districts:', err))

    fetch('/api/aqi')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAqiData(data)
        }
      })
      .catch(err => console.error('Failed to fetch AQI:', err))

    fetch('/api/traffic')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTrafficData(data)
        }
      })
      .catch(err => console.error('Failed to fetch traffic:', err))

    fetch('/api/traffic?history=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTrafficHistory(data)
        }
      })
      .catch(err => console.error('Failed to fetch traffic history:', err))

    fetch('/api/predictive-insights')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setMlPredictions(data)
        }
      })
      .catch(err => console.error('Failed to load predictions:', err))
  }, [])

  const districtCoords = useMemo(() => {
    const coords: Record<string, [number, number]> = {}
    districts.forEach(d => {
      coords[d.name] = [d.latitude, d.longitude]
    })
    return coords
  }, [districts])

  const normalizedAqiData = useMemo(() => {
    if (dataSourceType === 'actual') return aqiData
    return aqiData.map(item => {
      const pred = mlPredictions.aqi_forecast?.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.name))
      if (pred) {
        return {
          ...item,
          aqi: pred.predicted_value,
          pm25: pred.pm25 !== undefined ? pred.pm25 : item.pm25,
          pm10: pred.pm10 !== undefined ? pred.pm10 : item.pm10
        }
      }
      return item
    })
  }, [aqiData, dataSourceType, mlPredictions])

  const normalizedTrafficData = useMemo(() => {
    if (dataSourceType === 'actual') return trafficData
    return trafficData.map(item => {
      const pred = mlPredictions.traffic_congestion?.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.district_name))
      if (pred) {
        return {
          ...item,
          congestion_score: pred.predicted_value,
          current_speed: pred.predicted_speed !== undefined ? pred.predicted_speed : item.current_speed
        }
      }
      return item
    })
  }, [trafficData, dataSourceType, mlPredictions])

  const aqiListToRender = normalizedAqiData

  const aqiStats = useMemo(() => {
    if (normalizedAqiData.length === 0) {
      return { avg: 0, maxVal: 0, maxStation: 'N/A', minVal: 0, minStation: 'N/A', count: 0 }
    }
    const count = normalizedAqiData.length
    const sum = normalizedAqiData.reduce((acc: any, d: any) => acc + d.aqi, 0)
    const avg = Math.round(sum / count)
    const sorted = [...normalizedAqiData].sort((a, b) => b.aqi - a.aqi)
    const maxVal = sorted[0].aqi
    const maxStation = sorted[0].name
    const minVal = sorted[sorted.length - 1].aqi
    const minStation = sorted[sorted.length - 1].name
    return { avg, maxVal, maxStation, minVal, minStation, count }
  }, [normalizedAqiData])

  // Filters
  const router = useRouter()
  const pathname = usePathname()
  const districtFilter = searchParams.get('district') || 'all'

  const setDistrictFilter = (district: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (district === 'all') {
      params.delete('district')
    } else {
      params.set('district', district)
    }
    router.push(`${pathname}?${params.toString()}`)
  }
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'day' | 'night'>('all')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

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

  const satisfactoryCount = aqiListToRender.filter(r => r.aqi <= 100).length
  const poorCount = aqiListToRender.filter(r => r.aqi > 100).length
  const totalCount = aqiListToRender.length
  const satisfactoryPct = totalCount > 0 ? Math.round((satisfactoryCount / totalCount) * 100) : 0
  const poorPct = totalCount > 0 ? Math.round((poorCount / totalCount) * 100) : 0
  const topPolluted = [...aqiListToRender].sort((a, b) => b.aqi - a.aqi).slice(0, 4)

  const trafficStats = useMemo(() => {
    if (normalizedTrafficData.length === 0) {
      return { avg: 0, heavyCount: 0, moderateCount: 0, totalCount: 0, topCongested: [] }
    }
    const total = normalizedTrafficData.length
    const sum = normalizedTrafficData.reduce((acc, d) => acc + d.congestion_score, 0)
    const avg = Math.round(sum / total)
    const heavyCount = normalizedTrafficData.filter(d => d.congestion_score >= 50).length
    const moderateCount = normalizedTrafficData.filter(d => d.congestion_score >= 25 && d.congestion_score < 50).length
    const topCongested = [...normalizedTrafficData].sort((a, b) => b.congestion_score - a.congestion_score).slice(0, 4)
    return { avg, heavyCount, moderateCount, totalCount: total, topCongested }
  }, [normalizedTrafficData])

  return (
    <main className="min-h-screen bg-[#f6f6f3] py-10 px-6 font-sans">
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
      <div className="w-full px-8">
        
        {/* Header Row */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '28px', color: '#000000' }}>
              {heatmapType === 'traffic' ? 'TomTom Traffic Flow Segment Heatmap' : heatmapType === 'aqi' ? 'AQI Telemetry Heatmap' : heatmapType === 'weather' ? 'Weather & Temperature Grid' : heatmapType === 'incidents' ? 'Civic Incident Density' : 'Crime-Specific Hotspots'}
            </h1>
            <p style={{ fontSize: '14px', color: '#262622', marginTop: '4px' }}>
              {heatmapType === 'traffic' ? 'Real-time traffic speeds, delays, and congestion reports across Karnataka' : heatmapType === 'aqi' ? 'Air Quality index sensor data across Karnataka state' : heatmapType === 'weather' ? 'Live regional temperature and rain conditions' : heatmapType === 'incidents' ? 'Density of citizen complaints and public infrastructure reports' : 'Select a crime type to view complaints density by district'}
            </p>
          </div>
          
          {/* District Selector Dropdown (Styled like the mockup top-bar dropdown) */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#262622]">District:</span>
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="h-10 pl-4 pr-10 rounded-2xl border border-[#dadad3] text-sm font-bold text-black bg-white cursor-pointer shadow-sm outline-none appearance-none min-w-[200px]" style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230f172a\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="all">All Karnataka Districts</option>
              {Object.keys(districtCoords).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Horizontal Category Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
          {heatmapType === 'traffic' ? (
            [
              {
                id: 'avg_cong',
                label: 'State Avg Congestion',
                value: `${trafficStats.avg}%`,
                color: '#6D9998',
                subtitle: 'Delay metric'
              },
              {
                id: 'heavy_cong',
                label: 'Heavy Congestion',
                value: `${trafficStats.heavyCount} districts`,
                color: '#ef4444',
                subtitle: '50%+ delay score'
              },
              {
                id: 'mod_cong',
                label: 'Moderate Congestion',
                value: `${trafficStats.moderateCount} districts`,
                color: '#f97316',
                subtitle: '25-50% delay score'
              },
              {
                id: 'reporting',
                label: 'Active Feeds',
                value: `${trafficStats.totalCount} roads`,
                color: '#36375D',
                subtitle: 'TomTom traffic links'
              }
            ].map(card => (
              <div
                key={card.id}
                className="bg-white border-1.5 border-[#dadad3] rounded-2xl py-4 px-5 flex flex-col gap-1 shadow-sm text-left"
              >
                <span className="text-[11px] font-bold text-[#555550] uppercase tracking-[0.5px]">{card.label}</span>
                <span className="text-2xl font-extrabold text-black my-1 font-display">{card.value}</span>
                <span className="text-[11px] text-[#64748B] font-medium">{card.subtitle}</span>
              </div>
            ))
          ) : heatmapType === 'aqi' ? (
            [
              {
                id: 'avg',
                label: 'State Average AQI',
                value: `${aqiStats.avg} AQI`,
                color: '#6D9998',
                subtitle: 'Satisfactory average'
              },
              {
                id: 'max',
                label: 'Max AQI Spike',
                value: `${aqiStats.maxVal} AQI`,
                color: '#ef4444',
                subtitle: `At ${aqiStats.maxStation}`
              },
              {
                id: 'min',
                label: 'Min AQI (Cleanest)',
                value: `${aqiStats.minVal} AQI`,
                color: '#7B8F65',
                subtitle: `At ${aqiStats.minStation}`
              },
              {
                id: 'count',
                label: 'Active Stations',
                value: `${aqiStats.count} sensors`,
                color: '#36375D',
                subtitle: 'MySQL telemetry feeds'
              }
            ].map(card => (
              <div
                key={card.id}
                className="bg-white border-1.5 border-[#dadad3] rounded-2xl py-4 px-5 flex flex-col gap-1 shadow-sm text-left"
              >
                <span className="text-[11px] font-bold text-[#555550] uppercase tracking-[0.5px]">{card.label}</span>
                <span className="text-2xl font-extrabold text-black my-1 font-display">{card.value}</span>
                <span className="text-[11px] text-[#64748B] font-medium">{card.subtitle}</span>
              </div>
            ))
          ) : (
            categoryCardsData.map(card => {
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
            })
          )}
        </div>

        {/* Pulsing alerts ticker panel if there are emerging category spikes */}
        {heatmapType !== 'aqi' && heatmapType !== 'traffic' && spikes.length > 0 && (
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
            <div className="text-[13px] font-bold">
              Emerging Trend Warning: Spikes detected in categories (
              {spikes.map(s => `${s.category.toUpperCase()}: ${s.count} cases`).join(', ')}
              ) in selected filters!
            </div>
            <span className="ml-auto bg-[#ef4444] text-white text-[10px] font-bold py-0.5 px-2 rounded-full animate-pulse">RED-ZONE PULSING</span>
          </div>
        )}

        {/* Map & Detail Panel Grid Layout */}
        <div className="flex flex-wrap gap-6 mb-4 w-full">
          
          {/* Left Side: Map Card */}
          <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col flex-[1.1_1_450px] min-w-[320px]">
            <div className="flex-1 w-full bg-[#f6f6f3] rounded-2xl overflow-hidden shadow-md border border-[#dadad3] relative min-h-[760px] flex flex-col">
              <CrimeLeafletMap 
                incidents={filtered} 
                selectedDistrict={districtFilter}
                timeOfDayFilter={timeOfDayFilter}
                onSelectDistrict={setDistrictFilter}
                onSelectIncident={setSelectedIncidentId}
                heatmapType={heatmapType}
                aqiData={normalizedAqiData}
                districts={districts}
                trafficData={normalizedTrafficData}
              />
            </div>
          </div>

          {/* Right Side: Details Panel */}
          <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-5 flex-[1_1_320px] min-w-[300px]">
            {heatmapType === 'traffic' ? (
              <div className="flex flex-col gap-6 font-sans">
                {/* Block 1: Overview Card */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#f1f5f9] pb-3">
                    <h3 className="font-extrabold text-[16px] text-[#0f172a] uppercase tracking-wide">
                      {districtFilter === 'all' ? 'KARNATAKA STATE' : districtFilter.toUpperCase()}
                    </h3>
                    <span className="bg-[#ecfdf5] text-[#10b981] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Overview
                    </span>
                  </div>

                  {/* 3-Column Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#0f172a]">{trafficStats.totalCount}</span>
                      <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider">Feeds</span>
                    </div>

                    <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#ef4444]">{trafficStats.heavyCount}</span>
                      <span className="text-[9px] font-bold text-[#b91c1c] uppercase tracking-wider">Heavy</span>
                    </div>

                    <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#d97706]">{trafficStats.moderateCount}</span>
                      <span className="text-[9px] font-bold text-[#b45309] uppercase tracking-wider">Moderate</span>
                    </div>
                  </div>

                  {/* Secondary stats row */}
                  <div className="flex justify-between items-center text-xs font-semibold text-[#334155] border-t border-[#f1f5f9] pt-3">
                    <div>
                      State Avg Congestion: <span className="font-bold text-[#0f172a]">{trafficStats.avg}%</span>
                    </div>
                    <div>
                      Heavy Spikes: <span className="font-bold text-[#ef4444]">{trafficStats.heavyCount} Active</span>
                    </div>
                  </div>
                </div>

                {/* Block 2: Top Polluted/Congested Breakdown */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    TOP CONGESTED DISTRICTS
                  </h4>
                  <div className="flex flex-col gap-3.5">
                    {trafficStats.topCongested.length === 0 ? (
                      <span className="text-xs text-slate-400">No traffic data available</span>
                    ) : (
                      trafficStats.topCongested.map((row: any, idx: number) => {
                        const barColors = ['#ef4444', '#3b82f6', '#f97316', '#a855f7']
                        const color = barColors[idx] || '#64748b'
                        return (
                          <div key={row.district_name} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-[#1e293b]">
                              <span>{row.district_name} ({row.road_name})</span>
                              <span>{row.congestion_score}% delay</span>
                            </div>
                            <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${row.congestion_score}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Block 3: History of latest fetches */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    FETCH HISTORY LOG
                  </h4>
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {trafficHistory.length === 0 ? (
                      <span className="text-xs text-slate-400">No fetch history logged</span>
                    ) : (
                      trafficHistory.map((item: any) => {
                        const dateText = new Date(item.fetchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        const dateDay = new Date(item.fetchTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
                        return (
                          <button
                            key={item.fetchTimestamp}
                            onClick={() => {
                              fetch(`/api/traffic?timestamp=${item.fetchTimestamp}`)
                                .then(res => res.json())
                                .then(data => {
                                  if (Array.isArray(data)) {
                                    setTrafficData(data)
                                    alert(`Loaded traffic snapshot from ${dateDay} ${dateText}`)
                                  }
                                })
                            }}
                            className="w-full p-2.5 rounded-xl border border-[#dadad3] bg-[#f8fafc] text-left text-xs font-semibold hover:bg-[#f1f5f9] transition-colors flex justify-between items-center text-black"
                          >
                            <div className="text-left">
                              <div className="font-bold text-[#0f172a]">{dateDay} {dateText}</div>
                              <div className="text-[10px] text-[#64748b] mt-0.5">{item.points} sensor segments logged</div>
                            </div>
                            <span className="text-[10px] bg-[#fef2f2] text-[#ef4444] px-2 py-0.5 rounded-full font-bold">
                              {item.avgCongestion}% Avg
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Block 4: Anomalies Detected */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    TRAFFIC SENSOR ANOMALIES
                  </h4>
                  <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {trafficStats.heavyCount === 0 ? (
                      <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-3 text-center text-xs text-[#15803d] font-bold">
                        ✅ Traffic speeds normal across all state segments.
                      </div>
                    ) : (
                      trafficData.filter(d => d.congestion_score >= 50).map((row: any) => (
                        <div
                          key={row.district_name}
                          className="bg-[#fef2f2] border border-[#fee2e2] text-[#b91c1c] p-3 rounded-xl border text-xs flex flex-col gap-1"
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span>⚠️ {row.district_name}</span>
                            <span>{row.congestion_score}% Congested</span>
                          </div>
                          <span className="font-medium opacity-90">
                            Road: <strong>{row.road_name}</strong> - Speed restricted to <strong>{row.current_speed} km/h</strong> (free flow: {row.free_flow_speed} km/h).
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sync Trigger button */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/traffic', { method: 'POST' })
                      const json = await res.json()
                      if (json.success && Array.isArray(json.data)) {
                        setTrafficData(json.data)
                        // Reload history
                        const hRes = await fetch('/api/traffic?history=true')
                        const hJson = await hRes.json()
                        if (Array.isArray(hJson)) setTrafficHistory(hJson)
                        alert('Database refreshed successfully with live TomTom Traffic Flow telemetry!')
                      }
                    } catch (err) {
                      console.error('Failed to sync traffic:', err)
                    }
                  }}
                  className="h-10 rounded-2xl border-none bg-[#36375D] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(54,55,93,0.15)] transition-all duration-150 hover:bg-[#2e2f50] active:scale-98"
                >
                  🔄 Fetch Live TomTom Traffic
                </button>
              </div>
            ) : heatmapType === 'aqi' ? (
              <div className="flex flex-col gap-6 font-sans">
                {/* Block 1: Overview Card */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#f1f5f9] pb-3">
                    <h3 className="font-extrabold text-[16px] text-[#0f172a] uppercase tracking-wide">
                      {districtFilter === 'all' ? 'KARNATAKA STATE' : districtFilter.toUpperCase()}
                    </h3>
                    <span className="bg-[#ecfdf5] text-[#10b981] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Overview
                    </span>
                  </div>

                  {/* 3-Column Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#0f172a]">{totalCount}</span>
                      <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider">Total</span>
                    </div>

                    <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#10b981]">{satisfactoryCount}</span>
                      <span className="text-[9px] font-bold text-[#15803d] uppercase tracking-wider">Solved ({satisfactoryPct}%)</span>
                    </div>

                    <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-3 text-center flex flex-col justify-between min-h-[85px]">
                      <span className="text-[20px] font-extrabold text-[#ef4444]">{poorCount}</span>
                      <span className="text-[9px] font-bold text-[#b91c1c] uppercase tracking-wider">Active ({poorPct}%)</span>
                    </div>
                  </div>

                  {/* Secondary stats row */}
                  <div className="flex justify-between items-center text-xs font-semibold text-[#334155] border-t border-[#f1f5f9] pt-3">
                    <div>
                      Avg. AQI: <span className="font-bold text-[#0f172a]">{aqiStats.avg}</span>
                    </div>
                    <div>
                      Anomalies: <span className="font-bold text-[#ef4444]">{poorCount} Active</span>
                    </div>
                  </div>
                </div>

                {/* Block 2: Top Polluted Breakdown */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    TOP POLLUTION BREAKDOWN
                  </h4>
                  <div className="flex flex-col gap-3.5">
                    {topPolluted.length === 0 ? (
                      <span className="text-xs text-slate-400">No sensor data available</span>
                    ) : (
                      topPolluted.map((row: any, idx: number) => {
                        const barColors = ['#ef4444', '#3b82f6', '#f97316', '#a855f7']
                        const color = barColors[idx] || '#64748b'
                        const pct = Math.min(100, Math.round((row.aqi / 300) * 100))
                        return (
                          <div key={row.stationId} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-[#1e293b]">
                              <span>{row.name}</span>
                              <span>{row.aqi} AQI</span>
                            </div>
                            <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Block 3: Temporal Patterns & Trends */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    TEMPORAL PATTERNS & TRENDS
                  </h4>
                  <div className="flex flex-col gap-3 text-xs leading-relaxed text-[#334155]">
                    <div>
                      <strong className="text-[#0f172a]">Weekly Pattern:</strong> Weekdays (Mon-Wed) dominate with 35% traffic emission spike in urban centers.
                    </div>
                    <div>
                      <strong className="text-[#0f172a]">Diurnal Rhythm:</strong> Morning peak hours (08:00 AM - 11:00 AM) show highest particulate load anomalies.
                    </div>
                    
                    <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-xl p-3 mt-2 text-[#0369a1] font-bold text-center">
                      • Weekly recurrence: 2 cycles separated by 7 days detected.
                    </div>
                  </div>
                </div>

                {/* Block 4: Anomalies Detected */}
                <div className="bg-white rounded-2xl border border-[#dadad3] p-5 flex flex-col gap-4 shadow-sm">
                  <h4 className="font-extrabold text-[12px] text-[#0f172a] uppercase tracking-wider border-b border-[#f1f5f9] pb-2">
                    ANOMALIES DETECTED
                  </h4>
                  <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {poorCount === 0 ? (
                      <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-3 text-center text-xs text-[#15803d] font-bold">
                        ✅ No sensor anomalies detected. All stations under baseline.
                      </div>
                    ) : (
                      aqiListToRender.filter((r: any) => r.aqi > 100).map((row: any) => {
                        const isSevere = row.aqi > 150
                        return (
                          <div
                            key={row.stationId}
                            className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${
                              isSevere
                                ? 'bg-[#fef2f2] border-[#fee2e2] text-[#b91c1c]'
                                : 'bg-[#fffbeb] border-[#fef3c7] text-[#b45309]'
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span>⚠️ {row.name}</span>
                              <span>{row.aqi} AQI</span>
                            </div>
                            <span className="font-medium opacity-90">
                              {isSevere
                                ? 'Critical spike: particulate index is 1.5x higher than baseline.'
                                : 'Moderate elevation: minor deviation detected.'}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Sync Trigger button */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/aqi', { method: 'POST' })
                      const json = await res.json()
                      if (json.success && Array.isArray(json.data)) {
                        setAqiData(json.data)
                        alert('Database refreshed successfully with live WAQI API telemetry!')
                      }
                    } catch (err) {
                      console.error('Failed to sync AQI:', err)
                    }
                  }}
                  className="h-10 rounded-2xl border-none bg-[#36375D] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(54,55,93,0.15)] transition-all duration-150 hover:bg-[#2e2f50] active:scale-98"
                >
                  🔄 Fetch Live WAQI Updates
                </button>
              </div>
            ) : (
              <>
                {/* Detail Panel Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid #dadad3', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {districtFilter !== 'all' && (
                        <button 
                          onClick={() => setDistrictFilter('all')}
                          className="p-1.5 hover:bg-[#f6f6f3] rounded-lg transition-colors flex items-center justify-center border border-[#dadad3] active:scale-95 text-[#262622]"
                          title="Back to State View"
                        >
                          ←
                        </button>
                      )}
                      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '20px', color: '#000000', margin: 0 }}>
                        {districtFilter === 'all' ? 'Karnataka State' : districtFilter}
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#262622', fontWeight: 600, display: 'block', marginTop: '4px' }}>JURISDICTION OVERVIEW</span>
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
                <div className="flex border border-[#dadad3] rounded-2xl bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="flex-1 py-3 px-2.5 text-center border-r border-[#dadad3]">
                    <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Total Cases</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#000000', margin: '4px 0' }}>{districtStats.total}</div>
                    <div className="text-[10px] text-red-500 font-semibold">↑ 12% vs last wk</div>
                  </div>
                  <div className="flex-1 py-3 px-2.5 text-center border-r border-[#dadad3]">
                    <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Solved</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#6D9998', margin: '4px 0' }}>{Math.round(districtStats.total * 0.6)}</div>
                    <div style={{ fontSize: '10px', color: '#262622', fontWeight: 500 }}>60% solved</div>
                  </div>
                  <div className="flex-1 py-3 px-2.5 text-center">
                    <div style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>Active</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c', margin: '4px 0' }}>{districtStats.total - Math.round(districtStats.total * 0.6)}</div>
                    <div style={{ fontSize: '10px', color: '#262622', fontWeight: 500 }}>40% active</div>
                  </div>
                </div>

                {/* 2-Column Stats Row */}
                <div className="flex gap-3 w-full">
                  <div className="flex-1 border border-[#dadad3] rounded-2xl p-2.5 bg-[#f6f6f3] flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[11px] text-[#262622] font-semibold">
                      <Clock size={12} /> Avg. Response
                    </div>
                    <div className="text-base font-extrabold text-black">18m</div>
                    <span className="text-[10px] text-[#6D9998] font-semibold">↓ 3m from yesterday</span>
                  </div>
                  <div className="flex-1 border border-[#dadad3] rounded-2xl p-2.5 bg-[#f6f6f3] flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[11px] text-[#262622] font-semibold">
                      <ShieldAlert size={12} /> Escalations
                    </div>
                    <div className="text-base font-extrabold text-red-500">{districtStats.urgent}</div>
                    <span className="text-[10px] text-red-500 font-semibold">↑ 1 from yesterday</span>
                  </div>
                </div>

                {/* Category distribution list */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Top Sub-Issues
                  </h4>
                  <div className="flex flex-col gap-2.5">
                    {districtStats.categories.map(cat => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-[#262622] w-[90px] capitalize whitespace-nowrap overflow-hidden text-ellipsis">
                          {cat.name}
                        </span>
                        <div className="flex-1 h-2 bg-[#f6f6f3] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
                        </div>
                        <span className="text-[11px] font-bold text-[#262622] w-[50px] text-right">
                          {cat.count} ({cat.pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>


                {/* Temporal Autocorrelation & Rhythms */}
                <div className="border-t border-[#dadad3] pt-4">
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
                <div className="border-t border-[#dadad3] pt-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                      Contextual Anomalies
                    </h4>
                    {anomaliesCount > 0 ? (
                      <span className="text-[10px] bg-[#fee2e2] text-red-500 py-0.5 px-2 rounded-full font-bold">
                        {anomaliesCount} flagged
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#dcfce7] text-[#6D9998] py-0.5 px-2 rounded-full font-bold">
                        0 flagged
                      </span>
                    )}
                  </div>
                  {anomaliesCount > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {anomalyResults.filter(r => r.isAnomaly).map((r, idx) => {
                        const matchedInc = districtIncidents.find(i => i.id === r.id)
                        if (!matchedInc) return null
                        return (
                          <div key={idx} className="bg-[#fee2e2] border border-[#fca5a5] p-3 rounded-xl text-[11px]">
                            <div className="font-bold text-[#b91c1c]">⚠️ {matchedInc.case_number} ({matchedInc.category.toUpperCase()})</div>
                            <div className="text-[#7f1d1d] mt-0.5">MO: {matchedInc.modus_operandi}</div>
                            <div className="text-[#991b1b] font-semibold text-[10px] mt-1">Anomaly Score: {r.score.toFixed(3)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>


                {/* Repetitive MO patterns */}
                <div className="border-t border-[#dadad3] pt-4">
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#262622', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Repetitive MO Crime Series
                  </h4>
                  {detectedSeries.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                      No repetitive modus operandi series identified in filtered region.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detectedSeries.map((s, sIdx) => (
                        <div key={sIdx} className="bg-[#f5f3ff] border border-[#ddd6fe] py-2.5 px-3 rounded-xl text-[11px]">
                          <div className="font-bold text-[#6d28d9] flex justify-between">
                            <span>Series #{s.seriesId} (Cluster #{s.clusterId})</span>
                            <span>{Math.round(s.averageSimilarity * 100)}% Match</span>
                          </div>
                          <div className="text-[#5b21b6] mt-1 leading-snug">
                            <strong>Pattern:</strong> <span style={{ fontStyle: 'italic' }}>{s.commonPattern}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
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
                  className="mt-auto w-full h-11 bg-[#e60023] text-white border-none rounded-2xl text-sm font-bold cursor-pointer transition-all duration-120 flex items-center justify-center gap-1.5"
                  onMouseEnter={e => e.currentTarget.style.background = '#e60023'}
                  onMouseLeave={e => e.currentTarget.style.background = '#e60023'}
                >
                  View All Complaints &rarr;
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions Row */}
        <div className="flex justify-between items-center flex-wrap gap-4 mt-2 mb-8 w-full">
          {/* Left: Tip Banner */}
          <div className="flex items-center gap-2 bg-[#eff6ff] text-[#1e3a8a] py-2.5 px-4 rounded-2xl text-xs font-semibold">
            <AlertTriangle size={14} style={{ color: '#e60023' }} />
            <span>Tip: Click on any district boundary to view detailed complaints and trends</span>
          </div>

          {/* Right: Download Button */}
          <button
            onClick={() => alert('Feature: Downloading PDF crime intelligence report...')}
            className="flex items-center gap-1.5 bg-white border border-[#dadad3] rounded-2xl py-2.5 px-4 text-xs font-semibold text-[#262622] cursor-pointer shadow-sm transition-all duration-120"
            onMouseEnter={e => e.currentTarget.style.background = '#f6f6f3'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <RefreshCw size={14} />
            <span>Download Heatmap</span>
          </button>
        </div>

        {/* ML Forecast Control & Comparison Card */}
        <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-6 w-full mt-6 mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#36375D', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={16} className="animate-pulse" />
                ML Forecast Control &amp; Comparison ({heatmapType === 'aqi' ? 'AQI' : 'Traffic'})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Select telemetry data source and view comparison across all districts.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDataSourceType('actual')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid ' + (dataSourceType === 'actual' ? '#36375D' : '#dadad3'),
                  background: dataSourceType === 'actual' ? '#36375D' : '#ffffff',
                  color: dataSourceType === 'actual' ? '#ffffff' : '#262622',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>☀️ Live actual telemetry</span>
                {dataSourceType === 'actual' && <CheckCircle2 size={13} />}
              </button>

              <button
                onClick={() => setDataSourceType('predicted')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid ' + (dataSourceType === 'predicted' ? '#36375D' : '#dadad3'),
                  background: dataSourceType === 'predicted' ? '#36375D' : '#ffffff',
                  color: dataSourceType === 'predicted' ? '#ffffff' : '#262622',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>🤖 ML predicted (24h Forecast)</span>
                {dataSourceType === 'predicted' && <CheckCircle2 size={13} />}
              </button>
            </div>
          </div>

          {/* Comparison Grid */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {heatmapType === 'aqi' ? (
                aqiData?.map((item: any) => {
                  const pred = mlPredictions.aqi_forecast?.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.name))
                  const actualVal = item.aqi
                  const predVal = pred ? pred.predicted_value : actualVal * 1.05
                  
                  return (
                    <div key={item.stationId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#64748b' }}>Act: {actualVal.toFixed(0)}</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>ML: {predVal.toFixed(0)}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                trafficData?.map((item: any) => {
                  const pred = mlPredictions.traffic_congestion?.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.district_name))
                  const actualVal = item.congestion_score
                  const predVal = pred ? pred.predicted_value : actualVal * 1.05
                  
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.district_name}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#64748b' }}>Act: {actualVal.toFixed(0)}%</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>ML: {predVal.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Police Station details / AQI listing */}
        <div id="station-logs-section" className="bg-white rounded-2xl border border-[#dadad3] shadow-sm overflow-hidden">
          <div className="py-5 px-6 border-b border-[#dadad3] flex justify-between items-center">
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', margin: 0 }}>
              {heatmapType === 'aqi' ? 'Air Quality Index (AQI) Telemetry' : 'TomTom Traffic Flow Segment Telemetry'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              {heatmapType === 'aqi' ? 'MySQL Database Ledger' : 'TomTom Traffic API'}
            </span>
          </div>
          <table className="w-full border-collapse text-[15px] text-left">
            {heatmapType === 'aqi' ? (
              <>
                <thead>
                  <tr className="text-[#262622] font-semibold border-b border-[#dadad3] text-sm">
                    <th className="py-4 pl-8 pr-4 bg-[#f6f6f3]">Station ID</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Station Name</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">District / Ward</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">AQI</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">PM2.5</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">PM10</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Status</th>
                    <th className="py-4 pl-4 pr-8 text-right bg-[#f6f6f3]">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {aqiListToRender.map((row: any) => {
                    const status = getAqiStatus(row.aqi)
                    return (
                      <tr 
                        key={row.stationId} 
                        className="border-b border-[#f6f6f3] text-[#262622]"
                      >
                        <td className="py-4 pl-8 pr-4 font-bold text-black">{row.stationId}</td>
                        <td className="py-4 px-4">{row.name} Station</td>
                        <td className="py-4 px-4">{row.name}</td>
                        <td className="py-4 px-4 font-bold" style={{ color: row.aqi > 100 ? '#ef4444' : '#7B8F65' }}>{row.aqi}</td>
                        <td className="py-4 px-4">{row.pm25}</td>
                        <td className="py-4 px-4">{row.pm10}</td>
                        <td className="py-4 px-4">
                          <span className="text-[11px] py-0.5 px-2 rounded font-bold" style={{ background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)', color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65' }}>{status}</span>
                        </td>
                        <td className="py-4 pl-4 pr-8 text-right font-medium">
                          {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="text-[#262622] font-semibold border-b border-[#dadad3] text-sm">
                    <th className="py-4 pl-8 pr-4 bg-[#f6f6f3]">Road Segment</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">District</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Current Speed</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Free Flow Speed</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Congestion Score</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Severity</th>
                    <th className="py-4 pl-4 pr-8 text-right bg-[#f6f6f3]">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedTrafficData.map((row: any) => {
                    const severity = row.congestion_score >= 50 ? 'Heavy' : row.congestion_score >= 25 ? 'Moderate' : 'Light'
                    return (
                      <tr 
                        key={row.id} 
                        className="border-b border-[#f6f6f3] text-[#262622]"
                      >
                        <td className="py-4 pl-8 pr-4 font-bold text-black">{row.road_name}</td>
                        <td className="py-4 px-4">{row.district_name}</td>
                        <td className="py-4 px-4">{Math.round(row.current_speed)} km/h</td>
                        <td className="py-4 px-4">{Math.round(row.free_flow_speed)} km/h</td>
                        <td className="py-4 px-4 font-bold" style={{ color: row.congestion_score >= 50 ? '#ef4444' : row.congestion_score >= 25 ? '#f97316' : '#7B8F65' }}>{row.congestion_score}%</td>
                        <td className="py-4 px-4">
                          <span className="text-[11px] py-0.5 px-2 rounded font-bold" style={{ 
                            background: row.congestion_score >= 50 ? 'rgba(239,68,68,0.08)' : row.congestion_score >= 25 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)', 
                            color: row.congestion_score >= 50 ? '#ef4444' : row.congestion_score >= 25 ? '#f97316' : '#7B8F65' 
                          }}>{severity}</span>
                        </td>
                        <td className="py-4 pl-4 pr-8 text-right font-medium">
                          {row.fetchTimestamp ? new Date(row.fetchTimestamp).toLocaleDateString() : new Date().toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>

      {selectedIncidentId && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.6)] backdrop-blur-sm flex items-center justify-center z-[9999] p-6 animate-fade-in">
          {/* Modal Container */}
          <div className="bg-white rounded-[20px] w-full max-w-[840px] shadow-2xl border border-[#dadad3] overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="bg-black text-white py-5 px-7 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  CRIME INTELLIGENCE CASE FILE
                </span>
                <h2 className="text-[22px] font-extrabold mt-0.5 mb-0 font-display">
                  Case: {selectedIncident?.case_number}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedIncidentId(null)}
                className="bg-white/10 border-none text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-150"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-7 overflow-y-auto flex flex-col gap-6">
              
              {/* Top Summary Row */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 bg-[#f6f6f3] p-4 rounded-2xl border border-[#dadad3]">
                <div>
                  <div className="text-[11px] text-[#262622] font-semibold uppercase">Police Station</div>
                  <div className="text-sm font-bold text-black mt-0.5">{selectedIncident?.police_station}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#262622] font-semibold uppercase">Date &amp; Time</div>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {selectedIncident ? formatDateLong(selectedIncident.date_time) : ''}
                    <span className="block text-xs font-medium text-[#262622] mt-0.5">
                      {selectedIncident ? formatTime(selectedIncident.date_time) : ''}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#262622] font-semibold uppercase">Location &amp; District</div>
                  <div className="text-sm font-bold text-black mt-0.5">{selectedIncident?.location}</div>
                  <div className="text-[11px] text-[#262622] font-medium">{selectedIncident?.district}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#262622] font-semibold uppercase">Threat / Priority</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] font-bold py-0.5 px-2 rounded-full uppercase" style={{ background: selectedIncident?.priority === 'urgent' ? '#fee2e2' : selectedIncident?.priority === 'high' ? '#ffedd5' : '#fef3c7', color: selectedIncident?.priority === 'urgent' ? '#b91c1c' : selectedIncident?.priority === 'high' ? '#c2410c' : '#d97706' }}>
                      {selectedIncident?.priority}
                    </span>
                    <span className="text-[13px] font-bold text-black">Score: {selectedIncident?.risk_score}</span>
                  </div>
                </div>
              </div>

              {/* Main Split Layout */}
              <div className="grid grid-cols-[1.5fr_1fr] gap-7 flex-wrap">
                
                {/* Left side: Case Narrative */}
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#262622] border-b-2 border-[#dadad3] pb-1.5 mb-2.5 uppercase tracking-[0.5px]">
                      📜 Case History / Description
                    </h3>
                    <p className="text-sm text-[#262622] leading-relaxed bg-[#f6f6f3] p-4 rounded-2xl border-1.5 border-[#dadad3] m-0">
                      {selectedIncident?.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#262622] border-b-2 border-[#dadad3] pb-1.5 mb-2.5 uppercase tracking-[0.5px]">
                      ⚙️ Modus Operandi Details
                    </h3>
                    <p className="text-sm text-[#262622] leading-relaxed italic bg-[#fcfaff] p-4 rounded-2xl border-1.5 border-[#e8dbff] m-0">
                      {selectedIncident?.modus_operandi}
                    </p>
                  </div>
                </div>

                {/* Right side: Associated entities & Socio-economic context */}
                <div className="flex flex-col gap-5">
                  
                  {/* Suspects / Victims List */}
                  <div>
                    <h3 className="text-sm font-bold text-[#262622] border-b-2 border-[#dadad3] pb-1.5 mb-2.5 uppercase tracking-[0.5px]">
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
                                <span className="text-[13px] font-bold" style={{ color: isSuspect ? '#be123c' : '#0369a1' }}>
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
                              <div className="text-[11px] text-[#262622]">
                                Age: {person.demographics.age} | Gender: {person.demographics.gender}
                              </div>
                              <div className="text-[11px] text-[#262622] italic">
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
                    <h3 className="text-sm font-bold text-[#262622] border-b-2 border-[#dadad3] pb-1.5 mb-2.5 uppercase tracking-[0.5px]">
                      📊 Demographics Context
                    </h3>
                    <div className="bg-[#f6f6f3] border-1.5 border-[#dadad3] p-3 rounded-2xl flex flex-col gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#262622] font-semibold">Urbanization Rate:</span>
                        <span className="font-bold text-black capitalize">
                          {selectedIncident?.socio_economic_factors?.urbanization}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#262622] font-semibold">Population Density:</span>
                        <span className="font-bold text-black capitalize">
                          {selectedIncident?.socio_economic_factors?.density}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#262622] font-semibold">Poverty Index:</span>
                        <span className="font-bold text-black capitalize">
                          {selectedIncident?.socio_economic_factors?.poverty_index}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Footer Panel */}
            <div className="bg-[#f6f6f3] border-t border-[#dadad3] py-4 px-7 flex justify-end gap-3">
              <button
                onClick={() => setSelectedIncidentId(null)}
                className="h-[38px] px-5 bg-black text-white border-none rounded font-bold text-[13px] cursor-pointer transition-colors duration-120 hover:bg-neutral-800"
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

export default function CrimeIntelligencePage() {
  return (
    <Suspense fallback={<div className="py-10 px-6 bg-[#f6f6f3] min-h-screen text-center text-[#262622] font-semibold">Loading Intelligence Dashboard...</div>}>
      <CrimeIntelligenceContent />
    </Suspense>
  )
}
