'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  MapPin, Search, Compass, ChevronRight, TrendingUp, BarChart3, X,
  AlertTriangle, ShieldAlert, Thermometer, Wind, Car, RefreshCw,
  Layers, Map, Eye, Info, Check, AlertCircle, ArrowUpDown, Activity, CloudRain, Award
} from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { normalizeDistrictName, getComplaintDistrict } from '@/lib/utils/district'
import OverviewLeafletMap, { ProcessedDistrict, HeatmapMetric } from '@/components/official/OverviewLeafletMap'

// Dynamic Leaflet typings
declare global {
  interface Window {
    L: any
  }
}

interface WeatherRow {
  id: number
  district_name: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  precipitation: number
  weather_code: number
  wind_speed: number
  condition_label: string
  fetched_at: string
}

function computeStressRanks(
  districts: any[],
  aqiData: any[],
  trafficData: any[],
  weatherData: any[],
  crimeData: any,
  complaints: any[]
): ProcessedDistrict[] {
  const complaintsByDistrict: Record<string, number> = {}
  complaints.forEach(c => {
    const dist = getComplaintDistrict(c.location)
    complaintsByDistrict[dist] = (complaintsByDistrict[dist] || 0) + 1
  })

  const crimesByDistrict: Record<string, number> = {}
  if (crimeData && Array.isArray(crimeData.incidents)) {
    crimeData.incidents.forEach((inc: any) => {
      const dist = normalizeDistrictName(inc.district || '')
      crimesByDistrict[dist] = (crimesByDistrict[dist] || 0) + 1
    })
  }

  const list: ProcessedDistrict[] = districts.map(d => {
    const normName = normalizeDistrictName(d.name)
    
    const baselineComplaints = d.civic_complaints || 0
    const activeComplaints = complaintsByDistrict[normName] || 0
    const totalComplaints = baselineComplaints + activeComplaints

    const crimes = crimesByDistrict[normName] || 0

    const aqiReading = aqiData.find((a: any) => normalizeDistrictName(a.name) === normName)
    const aqi = aqiReading ? aqiReading.aqi : 50

    const trafficReading = trafficData.find((t: any) => normalizeDistrictName(t.district_name) === normName)
    const congestion = trafficReading ? trafficReading.congestion_score : 10

    const weatherReading = weatherData.find((w: any) => normalizeDistrictName(w.district_name) === normName)
    const temp = weatherReading ? weatherReading.temperature : (d.temp || 25)
    const rain = weatherReading ? weatherReading.precipitation : 0

    return {
      name: normName,
      latitude: d.latitude,
      longitude: d.longitude,
      civicComplaints: totalComplaints,
      crimesCount: crimes,
      aqi,
      congestion,
      temp,
      rain,
      civicScore: 0,
      crimeScore: 0,
      aqiScore: 0,
      trafficScore: 0,
      tempScore: 0,
      rainScore: 0,
      overallScore: 0,
      civicRank: 0,
      crimeRank: 0,
      aqiRank: 0,
      trafficRank: 0,
      tempRank: 0,
      rainRank: 0,
      overallRank: 0
    }
  })

  const maxCivic = Math.max(...list.map(x => x.civicComplaints), 1)
  const maxCrime = Math.max(...list.map(x => x.crimesCount), 1)
  const maxAqi = Math.max(...list.map(x => x.aqi), 1)
  const maxTraffic = Math.max(...list.map(x => x.congestion), 1)
  const maxTemp = Math.max(...list.map(x => x.temp), 1)
  const maxRain = Math.max(...list.map(x => x.rain), 1)

  list.forEach(item => {
    item.civicScore = (item.civicComplaints / maxCivic) * 100
    item.crimeScore = (item.crimesCount / maxCrime) * 100
    item.aqiScore = (item.aqi / maxAqi) * 100
    item.trafficScore = (item.congestion / maxTraffic) * 100
    item.tempScore = (item.temp / maxTemp) * 100
    item.rainScore = (item.rain / maxRain) * 100
    
    item.overallScore = (
      item.civicScore * 2.0 +
      item.crimeScore * 2.0 +
      item.aqiScore * 1.5 +
      item.trafficScore * 1.5 +
      item.tempScore * 0.5 +
      item.rainScore * 0.5
    ) / 8.0
  })

  const assignRankForKey = (key: keyof ProcessedDistrict, rankKey: keyof ProcessedDistrict) => {
    const sorted = [...list].sort((a, b) => {
      const va = a[key] as number
      const vb = b[key] as number
      return vb - va
    })
    sorted.forEach((item, index) => {
      const found = list.find(x => x.name === item.name)
      if (found) {
        (found as any)[rankKey] = index + 1
      }
    })
  }

  assignRankForKey('civicComplaints', 'civicRank')
  assignRankForKey('crimesCount', 'crimeRank')
  assignRankForKey('aqi', 'aqiRank')
  assignRankForKey('congestion', 'trafficRank')
  assignRankForKey('temp', 'tempRank')
  assignRankForKey('rain', 'rainRank')
  assignRankForKey('overallScore', 'overallRank')

  return list
}



export default function OfficialOperationsDashboard() {
  const db = createClient()

  // State arrays
  const [districts, setDistricts] = useState<any[]>([])
  const [aqiData, setAqiData] = useState<any[]>([])
  const [trafficData, setTrafficData] = useState<any[]>([])
  const [weatherData, setWeatherData] = useState<any[]>([])
  const [crimeData, setCrimeData] = useState<any>({ incidents: [], people: [], connections: [] })
  const [complaints, setComplaints] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null)
  const [heatmapType, setHeatmapType] = useState<HeatmapMetric>('overall')
  const [sortBy, setSortBy] = useState<HeatmapMetric>('overall')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const loadData = async () => {
    try {
      const [districtsRes, aqiRes, trafficRes, weatherRes, crimeRes, complaintsRes] = await Promise.all([
        fetch('/api/districts').then(res => res.json()),
        fetch('/api/aqi').then(res => res.json()),
        fetch('/api/traffic').then(res => res.json()),
        fetch('/api/weather').then(res => res.json()),
        fetch('/api/crime').then(res => res.json()),
        db.from('complaints').select('*')
      ])

      setDistricts(Array.isArray(districtsRes) ? districtsRes : [])
      setAqiData(Array.isArray(aqiRes) ? aqiRes : [])
      setTrafficData(Array.isArray(trafficRes) ? trafficRes : [])
      setWeatherData(Array.isArray(weatherRes) ? weatherRes : [])
      setCrimeData(crimeRes || { incidents: [], people: [], connections: [] })
      setComplaints(complaintsRes?.data || [])
    } catch (e) {
      console.error('Error fetching dashboard telemetry:', e)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])


  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Pre-processed aggregated district objects
  const processedDistricts = useMemo(() => {
    if (!districts.length) return []
    return computeStressRanks(districts, aqiData, trafficData, weatherData, crimeData, complaints)
  }, [districts, aqiData, trafficData, weatherData, crimeData, complaints])

  const districtHistoryPushed = useRef(false)

  const handleSelectDistrictByName = useCallback((name: string) => {
    const found = processedDistricts.find(d => normalizeDistrictName(d.name) === normalizeDistrictName(name))
    if (found) {
      window.history.pushState({ districtSelected: found.name }, '')
      districtHistoryPushed.current = true
      setSelectedDistrictName(found.name)
    } else {
      districtHistoryPushed.current = false
      setSelectedDistrictName(null)
    }
  }, [processedDistricts])

  const clearSelectedDistrict = useCallback(() => {
    if (districtHistoryPushed.current) {
      districtHistoryPushed.current = false
      window.history.back()
    } else {
      setSelectedDistrictName(null)
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (districtHistoryPushed.current) {
        districtHistoryPushed.current = false
        setSelectedDistrictName(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Pinned district helper
  const selectedDistrict = useMemo(() => {
    if (!selectedDistrictName || !processedDistricts.length) return null
    return processedDistricts.find(d => normalizeDistrictName(d.name) === normalizeDistrictName(selectedDistrictName)) || null
  }, [selectedDistrictName, processedDistricts])

  // Filtered leaderboard
  const filtered = useMemo(() => {
    let rows = processedDistricts.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase())
    )

    // Sort key translator
    const getSortValue = (d: ProcessedDistrict, key: HeatmapMetric): number => {
      switch (key) {
        case 'civic': return d.civicComplaints
        case 'crime': return d.crimesCount
        case 'aqi': return d.aqi
        case 'traffic': return d.congestion
        case 'temp': return d.temp
        case 'rain': return d.rain
        default: return d.overallScore
      }
    }

    rows = [...rows].sort((a, b) => {
      const va = getSortValue(a, sortBy)
      const vb = getSortValue(b, sortBy)
      // Rank 1 is highest value, so sorting is descending by default
      if (va < vb) return sortDir === 'asc' ? 1 : -1
      if (va > vb) return sortDir === 'asc' ? -1 : 1
      return 0
    })

    return rows
  }, [processedDistricts, search, sortBy, sortDir])

  const toggleSort = (col: HeatmapMetric) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc') // Default: rank descending (higher score is worst)
    }
  }

  // State-wide summaries
  const summaries = useMemo(() => {
    if (!processedDistricts.length) return null
    const aqis = processedDistricts.map(d => d.aqi)
    const congestions = processedDistricts.map(d => d.congestion)
    const complaintsSum = processedDistricts.reduce((sum, d) => sum + d.civicComplaints, 0)
    const crimesSum = processedDistricts.reduce((sum, d) => sum + d.crimesCount, 0)
    const temps = processedDistricts.map(d => d.temp)
    const rains = processedDistricts.map(d => d.rain)

    return {
      avgAqi: Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length),
      avgCongestion: Math.round(congestions.reduce((a, b) => a + b, 0) / congestions.length),
      totalComplaints: complaintsSum,
      totalCrimes: crimesSum,
      avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      avgRain: (rains.reduce((a, b) => a + b, 0) / rains.length).toFixed(1)
    }
  }, [processedDistricts])



  if (loading) {
    return (
      <div style={{ padding: '40px 24px', background: '#f6f6f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', fontFamily: 'Manrope, sans-serif' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#36375D' }} />
        <div style={{ fontWeight: 600, fontSize: '15px', color: '#64748b' }}>Generating district analytics ranking...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 30px', minHeight: '100vh', background: '#f6f6f3', fontFamily: 'Manrope, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .metric-pill {
          background: #fff;
          border: 1.5px solid #dadad3;
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 11px;
          font-weight: 700;
          color: #262622;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 150ms ease;
          outline: none;
          white-space: nowrap;
        }
        .metric-pill.active {
          border-color: #36375D;
          background: #36375D;
          color: #fff;
          box-shadow: 0 4px 12px rgba(54,55,93,0.15);
        }
        .rank-row {
          display: grid;
          grid-template-columns: 0.4fr 1fr 1fr 1fr 1fr 1fr 1.2fr;
          align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
          transition: all 100ms;
          border-bottom: 1px solid #f1f5f9;
        }
        .rank-row:hover {
          background: #f1f5f9;
        }
        .rank-row.selected {
          background: #e2e8f0;
          outline: 1.5px solid #36375D;
        }
        .rank-header {
          display: grid;
          grid-template-columns: 0.4fr 1fr 1fr 1fr 1fr 1fr 1.2fr;
          align-items: center;
          padding: 10px 14px;
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 2px solid #e2e8f0;
          letter-spacing: 0.5px;
        }
        .sort-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          user-select: none;
        }
        .sort-trigger.active {
          color: #36375D;
        }
        .micro-card {
          background: #fff;
          border: 1px solid #dadad3;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .detail-badge {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
      `}} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#36375D', color: '#fff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Compass size={20} />
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#262622', margin: 0, letterSpacing: '-0.3px', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Karnataka Operations Command Center
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
            Unified geospatial stress indexing and district-level comparative ranking engine
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: refreshing ? '#64748b' : '#36375D',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(54,55,93,0.15)',
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Refreshing systems data...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {/* State-wide summaries banner */}
      {summaries && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="micro-card">
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '8px', borderRadius: '10px', display: 'flex' }}><AlertCircle size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Civic Complaints</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.totalComplaints} tickets</div>
            </div>
          </div>
          <div className="micro-card">
            <div style={{ background: '#f5f3ff', color: '#8b5cf6', padding: '8px', borderRadius: '10px', display: 'flex' }}><ShieldAlert size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Crimes Logged</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.totalCrimes} cases</div>
            </div>
          </div>
          <div className="micro-card">
            <div style={{ background: '#f0f9ff', color: '#0ea5e9', padding: '8px', borderRadius: '10px', display: 'flex' }}><Wind size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>State Avg AQI</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.avgAqi} AQI</div>
            </div>
          </div>
          <div className="micro-card">
            <div style={{ background: '#fff7ed', color: '#f97316', padding: '8px', borderRadius: '10px', display: 'flex' }}><Car size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Avg Traffic Congestion</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.avgCongestion}% score</div>
            </div>
          </div>
          <div className="micro-card">
            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '10px', display: 'flex' }}><Thermometer size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>State Avg Temp</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.avgTemp}°C</div>
            </div>
          </div>
          <div className="micro-card">
            <div style={{ background: '#ecfeff', color: '#06b6d4', padding: '8px', borderRadius: '10px', display: 'flex' }}><CloudRain size={18} /></div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>State Avg Rain</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{summaries.avgRain} mm</div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap metric overlay buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overall', label: 'Overall Stress Index', icon: <Activity size={14} /> },
          { id: 'civic', label: 'Civic Complaints', icon: <AlertCircle size={14} /> },
          { id: 'crime', label: 'Crime Hotspots', icon: <ShieldAlert size={14} /> },
          { id: 'aqi', label: 'Air Quality (AQI)', icon: <Wind size={14} /> },
          { id: 'traffic', label: 'Traffic Congestion', icon: <Car size={14} /> },
          { id: 'temp', label: 'Temperature Map', icon: <Thermometer size={14} /> },
          { id: 'rain', label: 'Rainfall Map', icon: <CloudRain size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setHeatmapType(tab.id as HeatmapMetric)}
            className={`metric-pill ${heatmapType === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main split-screen panel */}
      <div className="flex flex-wrap gap-6 mb-4 w-full" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Left Side: Leaflet Heatmap container */}
        <div style={{ flex: '1.2 1 450px', minWidth: '320px', background: '#fff', borderRadius: '16px', border: '1px solid #dadad3', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} />
              Heatmap layer: <strong style={{ color: '#36375D', textTransform: 'capitalize' }}>{heatmapType} Analysis</strong>
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              Hover polygons to read · Click to pin district details
            </span>
          </div>

          <div style={{ height: '1150px', background: '#f6f6f3', borderRadius: '16px', overflow: 'hidden', border: '1px solid #dadad3', position: 'relative' }}>
            <OverviewLeafletMap
              districtsData={processedDistricts}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleSelectDistrictByName}
              heatmapType={heatmapType}
            />
          </div>
        </div>

        {/* Right Side: Rankings and Details Card */}
        <div style={{ flex: '1 1 320px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Selected District Details */}
          {selectedDistrict ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '2px solid #36375D', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 16px rgba(54,55,93,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#36375D', textTransform: 'uppercase', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                    PINNED DISTRICT DETAILS
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#262622', margin: '6px 0 0', fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                    {selectedDistrict.name}
                  </h2>
                </div>
                <button
                  onClick={() => clearSelectedDistrict()}
                  style={{ background: '#f1f5f9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}
                >
                  &times;
                </button>
              </div>

              {/* Stress Index score badge */}
              <div style={{ background: 'linear-gradient(135deg, #36375D 0%, #1e293b 100%)', borderRadius: '16px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px', color: '#fff' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Overall Stress Index</span>
                <span style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1, margin: '6px 0 2px' }}>
                  {selectedDistrict.overallScore.toFixed(1)} / 100
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
                  Statewide Rank: <strong>#{selectedDistrict.overallRank}</strong> of 30
                </span>
              </div>

              {/* Comparison grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="detail-badge">
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Complaints</span>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{selectedDistrict.civicComplaints} tickets</strong>
                  <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>Rank #{selectedDistrict.civicRank}</span>
                </div>
                <div className="detail-badge">
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Crimes Logged</span>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{selectedDistrict.crimesCount} cases</strong>
                  <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 600 }}>Rank #{selectedDistrict.crimeRank}</span>
                </div>
                <div className="detail-badge">
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Air Quality</span>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{selectedDistrict.aqi} AQI</strong>
                  <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Rank #{selectedDistrict.aqiRank}</span>
                </div>
                <div className="detail-badge">
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Traffic</span>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{selectedDistrict.congestion}% delay</strong>
                  <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 600 }}>Rank #{selectedDistrict.trafficRank}</span>
                </div>
                <div className="detail-badge" style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Weather Outlook</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#1e293b', fontWeight: 700, marginTop: '2px' }}>
                    <span>Temperature: {selectedDistrict.temp.toFixed(1)}°C (Rank #{selectedDistrict.tempRank})</span>
                    <span>Precipitation: {selectedDistrict.rain.toFixed(1)}mm (Rank #{selectedDistrict.rainRank})</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #dadad3', padding: '20px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <MapPin size={28} style={{ color: '#36375D', opacity: 0.8 }} />
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#262622' }}>Integrated Details Deck</div>
              <span style={{ fontSize: '11px', lineHeight: 1.4 }}>
                Click a district polygon on the interactive map or select a row in the rankings leaderboard below to access pinned analytics comparison cards.
              </span>
            </div>
          )}

          {/* Rankings Leaderboard Card */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #dadad3', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#262622', margin: 0, fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Statewide District Leaderboard
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Ranks sorted by active stress metrics (Rank 1 represents highest load)
              </span>
            </div>

            {/* Leaderboard Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search district..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #dadad3',
                  borderRadius: '12px',
                  padding: '8px 12px 8px 32px',
                  fontSize: '12px',
                  background: '#f8fafc',
                  outline: 'none',
                  color: '#262622',
                  fontWeight: 500,
                  boxSizing: 'border-box'
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            {/* Leaderboard Table */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '620px', minHeight: '300px' }}>
              <div className="rank-header">
                <span className={`sort-trigger ${sortBy === 'overall' ? 'active' : ''}`} onClick={() => toggleSort('overall')}>
                  Rk <ArrowUpDown size={10} />
                </span>
                <span>District</span>
                <span className={`sort-trigger ${sortBy === 'civic' ? 'active' : ''}`} onClick={() => toggleSort('civic')}>
                  Civic <ArrowUpDown size={10} />
                </span>
                <span className={`sort-trigger ${sortBy === 'crime' ? 'active' : ''}`} onClick={() => toggleSort('crime')}>
                  Crim <ArrowUpDown size={10} />
                </span>
                <span className={`sort-trigger ${sortBy === 'aqi' ? 'active' : ''}`} onClick={() => toggleSort('aqi')}>
                  AQI <ArrowUpDown size={10} />
                </span>
                <span className={`sort-trigger ${sortBy === 'traffic' ? 'active' : ''}`} onClick={() => toggleSort('traffic')}>
                  Traf <ArrowUpDown size={10} />
                </span>
                <span className={`sort-trigger ${sortBy === 'overall' ? 'active' : ''}`} onClick={() => toggleSort('overall')}>
                  Index
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                {filtered.map((d, index) => {
                  const isSelected = selectedDistrictName === d.name
                  
                  // Highlight cells depending on active sorting
                  const isCivicActive = sortBy === 'civic'
                  const isCrimeActive = sortBy === 'crime'
                  const isAqiActive = sortBy === 'aqi'
                  const isTrafficActive = sortBy === 'traffic'
                  const isOverallActive = sortBy === 'overall'

                  return (
                    <div
                      key={d.name}
                      onClick={() => handleSelectDistrictByName(d.name)}
                      className={`rank-row ${isSelected ? 'selected' : ''}`}
                    >
                      <span style={{ fontWeight: 800, color: d.overallRank <= 3 ? '#ef4444' : '#64748b' }}>
                        #{d.overallRank}
                      </span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>
                        {d.name}
                      </span>
                      <span style={{ color: isCivicActive ? '#ef4444' : '#475569', fontWeight: isCivicActive ? 800 : 500 }}>
                        {d.civicComplaints} <span style={{ fontSize: '9px', color: '#94a3b8' }}>(#{d.civicRank})</span>
                      </span>
                      <span style={{ color: isCrimeActive ? '#8b5cf6' : '#475569', fontWeight: isCrimeActive ? 800 : 500 }}>
                        {d.crimesCount} <span style={{ fontSize: '9px', color: '#94a3b8' }}>(#{d.crimeRank})</span>
                      </span>
                      <span style={{ color: isAqiActive ? '#10b981' : '#475569', fontWeight: isAqiActive ? 800 : 500 }}>
                        {d.aqi} <span style={{ fontSize: '9px', color: '#94a3b8' }}>(#{d.aqiRank})</span>
                      </span>
                      <span style={{ color: isTrafficActive ? '#f97316' : '#475569', fontWeight: isTrafficActive ? 800 : 500 }}>
                        {d.congestion}% <span style={{ fontSize: '9px', color: '#94a3b8' }}>(#{d.trafficRank})</span>
                      </span>
                      <span style={{ color: '#36375D', fontWeight: 800 }}>
                        {d.overallScore.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
