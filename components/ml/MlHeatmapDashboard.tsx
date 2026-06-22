'use client'

import React, { useState, useEffect } from 'react'
import { ModelType } from './MlModelSelector'
import { PredictionParams } from './MlControlPanel'
import { Map, Clock } from 'lucide-react'

interface MlHeatmapDashboardProps {
  activeModel: ModelType
  params: PredictionParams
  loading: boolean
}

// Complete coords mapping for all 30 districts of Karnataka
const DISTRICT_COORDS: Record<string, [number, number]> = {
  'Bengaluru Urban': [12.9716, 77.5946],
  'Bengaluru Rural': [13.2500, 77.6600],
  'Mysuru': [12.2958, 76.6394],
  'Belagavi': [15.8497, 74.4977],
  'Mangaluru': [12.9141, 74.8560],
  'Mandya': [12.5218, 76.8973],
  'Kalaburagi': [17.3297, 76.8343],
  'Bagalkot': [16.1817, 75.6958],
  'Ramanagara': [12.7209, 77.2784],
  'Ballari': [15.1394, 76.9214],
  'Bidar': [17.9104, 77.5199],
  'Vijayapura': [16.8302, 75.7100],
  'Chamarajanagar': [11.9261, 76.9402],
  'Chikkamagaluru': [13.3161, 75.7720],
  'Chikkaballapura': [13.4354, 77.7275],
  'Chitradurga': [14.2250, 76.3980],
  'Davanagere': [14.4670, 75.9220],
  'Dharwad': [15.4589, 75.0078],
  'Gadag': [15.4167, 75.6167],
  'Hassan': [13.0070, 76.1030],
  'Haveri': [14.7958, 75.3989],
  'Kodagu': [12.4244, 75.7390],
  'Kolar': [13.1367, 78.1292],
  'Koppal': [15.3525, 76.1550],
  'Raichur': [16.2058, 77.3558],
  'Shivamogga': [13.9299, 75.5681],
  'Tumakuru': [13.3379, 77.1006],
  'Udupi': [13.3409, 74.7421],
  'Uttara Kannada': [14.8080, 74.1300],
  'Yadgir': [16.7600, 77.1400]
}

function normalizeName(name: string): string {
  const norm = name.toLowerCase().trim()
  if (norm.includes('bengaluru') || norm.includes('bangalore')) return 'Bengaluru Urban'
  if (norm.includes('mysore') || norm.includes('mysuru')) return 'Mysuru'
  if (norm.includes('belgaum') || norm.includes('belagavi')) return 'Belagavi'
  if (norm.includes('mangaluru') || norm.includes('mangalore')) return 'Mangaluru'
  if (norm.includes('mandya')) return 'Mandya'
  if (norm.includes('gulbarga') || norm.includes('kalaburagi')) return 'Kalaburagi'
  if (norm.includes('bellary') || norm.includes('ballari')) return 'Ballari'
  if (norm.includes('bidar')) return 'Bidar'
  if (norm.includes('bijapur') || norm.includes('vijayapura')) return 'Vijayapura'
  if (norm.includes('chamarajanagar') || norm.includes('chamrajnagar')) return 'Chamarajanagar'
  if (norm.includes('chikmagalur') || norm.includes('chikkamagaluru')) return 'Chikkamagaluru'
  if (norm.includes('bagalkot')) return 'Bagalkot'
  if (norm.includes('ramanagara')) return 'Ramanagara'
  if (norm.includes('chikkaballapura')) return 'Chikkaballapura'
  if (norm.includes('chitradurga')) return 'Chitradurga'
  if (norm.includes('davanagere')) return 'Davanagere'
  if (norm.includes('dharwad')) return 'Dharwad'
  if (norm.includes('gadag')) return 'Gadag'
  if (norm.includes('hassan')) return 'Hassan'
  if (norm.includes('haveri')) return 'Haveri'
  if (norm.includes('kodagu')) return 'Kodagu'
  if (norm.includes('kolar')) return 'Kolar'
  if (norm.includes('koppal')) return 'Koppal'
  if (norm.includes('raichur')) return 'Raichur'
  if (norm.includes('shivamogga') || norm.includes('shimoga')) return 'Shivamogga'
  if (norm.includes('tumakuru') || norm.includes('tumkur')) return 'Tumakuru'
  if (norm.includes('udupi')) return 'Udupi'
  if (norm.includes('uttara kannada')) return 'Uttara Kannada'
  if (norm.includes('yadgir')) return 'Yadgir'
  if (norm.includes('bangalore rural') || norm.includes('bengaluru rural')) return 'Bengaluru Rural'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function MlHeatmapDashboard({ activeModel, params, loading }: MlHeatmapDashboardProps) {
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
      .catch(err => console.error('Failed to load Karnataka geojson:', err))
  }, [])

  useEffect(() => {
    if (!mapLoaded || !window.L || !geoJsonData) return

    const L = window.L

    // Clean up container HTML
    const liveContainer = document.getElementById('leaflet-live-map-container')
    const predContainer = document.getElementById('leaflet-predicted-map-container')
    
    if (liveContainer) liveContainer.innerHTML = '<div id="actual-live-map" style="height: 100%; width: 100%;"></div>'
    if (predContainer) predContainer.innerHTML = '<div id="actual-pred-map" style="height: 100%; width: 100%;"></div>'

    // Seed mock live values for all 30 districts of Karnataka
    const liveAqi: Record<string, number> = {
      'Bengaluru Urban': 142, 'Bengaluru Rural': 88, 'Mysuru': 58, 'Belagavi': 84, 'Mangaluru': 48,
      'Mandya': 52, 'Kalaburagi': 118, 'Ballari': 164, 'Bidar': 74, 'Vijayapura': 92,
      'Chamarajanagar': 38, 'Chikkamagaluru': 28, 'Bagalkot': 62, 'Ramanagara': 46, 'Chikkaballapura': 76,
      'Chitradurga': 94, 'Davanagere': 102, 'Dharwad': 82, 'Gadag': 68, 'Hassan': 44,
      'Haveri': 56, 'Kodagu': 22, 'Kolar': 78, 'Koppal': 72, 'Raichur': 124,
      'Shivamogga': 36, 'Tumakuru': 74, 'Udupi': 34, 'Uttara Kannada': 30, 'Yadgir': 86
    }

    const liveCongestion: Record<string, number> = {
      'Bengaluru Urban': 78, 'Bengaluru Rural': 38, 'Mysuru': 34, 'Belagavi': 42, 'Mangaluru': 28,
      'Mandya': 14, 'Kalaburagi': 36, 'Ballari': 48, 'Bidar': 22, 'Vijayapura': 32,
      'Chamarajanagar': 12, 'Chikkamagaluru': 8, 'Bagalkot': 18, 'Ramanagara': 26, 'Chikkaballapura': 24,
      'Chitradurga': 20, 'Davanagere': 30, 'Dharwad': 38, 'Gadag': 16, 'Hassan': 24,
      'Haveri': 14, 'Kodagu': 6, 'Kolar': 22, 'Koppal': 18, 'Raichur': 28,
      'Shivamogga': 18, 'Tumakuru': 32, 'Udupi': 20, 'Uttara Kannada': 10, 'Yadgir': 16
    }

    const liveComplaints: Record<string, number> = {
      'Bengaluru Urban': 18, 'Bengaluru Rural': 5, 'Mysuru': 6, 'Belagavi': 8, 'Mangaluru': 4,
      'Mandya': 2, 'Kalaburagi': 9, 'Ballari': 5, 'Bidar': 3, 'Vijayapura': 4,
      'Chamarajanagar': 1, 'Chikkamagaluru': 2, 'Bagalkot': 3, 'Ramanagara': 4, 'Chikkaballapura': 3,
      'Chitradurga': 6, 'Davanagere': 7, 'Dharwad': 8, 'Gadag': 2, 'Hassan': 3,
      'Haveri': 2, 'Kodagu': 1, 'Kolar': 4, 'Koppal': 3, 'Raichur': 6,
      'Shivamogga': 3, 'Tumakuru': 5, 'Udupi': 2, 'Uttara Kannada': 1, 'Yadgir': 3
    }

    // Semi-deterministic calculations for prediction values per district based on parameters
    const getPredictedVal = (dist: string) => {
      const normalizedDist = normalizeName(dist)
      
      if (activeModel === 'aqi') {
        const base = liveAqi[normalizedDist] || 70
        const hourEffect = Math.sin((params.hour - 6) * Math.PI / 12) * 20
        const tempEffect = (params.temp - 25) * 1.5
        const humidityEffect = (params.humidity - 50) * 0.4
        const pm25Effect = (params.pm25Baseline / 100) * 35
        return Math.max(10, Math.round(base + hourEffect + tempEffect + humidityEffect + pm25Effect))
      } else if (activeModel === 'traffic') {
        const base = liveCongestion[normalizedDist] || 30
        const hourPeak = [8, 9, 17, 18, 19].includes(params.hour)
        const peakMultiplier = hourPeak ? 1.5 : 0.9
        const weekendMultiplier = params.dayOfWeek === 'weekend' ? 0.75 : 1.1
        const weatherMultiplier = params.weatherCondition === 'rain' ? 1.4 : params.weatherCondition === 'fog' ? 1.2 : 1.0
        return Math.max(2, Math.min(99, Math.round(base * peakMultiplier * weekendMultiplier * weatherMultiplier)))
      } else {
        const base = liveComplaints[normalizedDist] || 4
        const rainMultiplier = 1 + (params.rainfall / 40)
        const backlogAdd = params.backlog / 40
        return Math.max(0, Math.round(base * rainMultiplier + backlogAdd))
      }
    }

    // Helper to get color code
    const getColor = (val: number, type: ModelType) => {
      if (type === 'aqi') {
        if (val > 150) return '#ef4444' // Red (Poor/Severe)
        if (val > 100) return '#f59e0b' // Orange (Moderate)
        if (val > 50) return '#84cc16'  // Light Green
        return '#10b981'                // Green (Good)
      } else if (type === 'traffic') {
        if (val > 70) return '#ef4444'  // Gridlock
        if (val > 40) return '#f59e0b'  // Moderate
        return '#10b981'                // Smooth
      } else {
        if (val > 12) return '#ef4444'  // High complaints
        if (val > 5) return '#f97316'   // Moderate complaints
        if (val > 2) return '#eab308'   // Light
        return '#7B8F65'                // Minimal
      }
    }

    // Instantiate Maps
    const center: [number, number] = [15.013923, 76.193331]
    const zoom = 6.4

    const mapLive = L.map('actual-live-map', {
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: true
    }).setView(center, zoom)

    const mapPred = L.map('actual-pred-map', {
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: true
    }).setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(mapLive)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(mapPred)

    // Render live GeoJSON layer
    L.geoJSON(geoJsonData, {
      style: (feature: any) => {
        const dName = normalizeName(feature.properties.Dist_Name || '')
        let val = 0
        if (activeModel === 'aqi') val = liveAqi[dName] || 50
        else if (activeModel === 'traffic') val = liveCongestion[dName] || 20
        else val = liveComplaints[dName] || 2

        return {
          color: '#6D9998',
          weight: 1.2,
          fillColor: getColor(val, activeModel),
          fillOpacity: 0.45
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const dName = normalizeName(feature.properties.Dist_Name || '')
        let val = 0
        let suffix = ''
        if (activeModel === 'aqi') {
          val = liveAqi[dName] || 50
          suffix = ' AQI'
        } else if (activeModel === 'traffic') {
          val = liveCongestion[dName] || 20
          suffix = '% Congestion'
        } else {
          val = liveComplaints[dName] || 2
          suffix = ' Complaints'
        }
        layer.bindPopup(`<strong>Live ${dName}</strong>: ${val}${suffix}`)
      }
    }).addTo(mapLive)

    // Render predicted GeoJSON layer
    L.geoJSON(geoJsonData, {
      style: (feature: any) => {
        const dName = feature.properties.Dist_Name || ''
        const val = getPredictedVal(dName)
        return {
          color: '#6D9998',
          weight: 1.2,
          fillColor: getColor(val, activeModel),
          fillOpacity: 0.45
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const dName = feature.properties.Dist_Name || ''
        const val = getPredictedVal(dName)
        let suffix = ''
        if (activeModel === 'aqi') suffix = ' AQI'
        else if (activeModel === 'traffic') suffix = '% Congestion'
        else suffix = ' Complaints'
        layer.bindPopup(`<strong>Predicted ${normalizeName(dName)}</strong>: ${val}${suffix}`)
      }
    }).addTo(mapPred)

    // Invalidate size helper
    const timer = setTimeout(() => {
      try {
        mapLive.invalidateSize()
        mapPred.invalidateSize()
      } catch (e) {
        console.error(e)
      }
    }, 250)

    // Link map movements for sync scrolling
    mapLive.on('zoomend', () => {
      mapPred.setZoom(mapLive.getZoom())
    })
    mapLive.on('drag', () => {
      mapPred.panTo(mapLive.getCenter())
    })

    return () => {
      clearTimeout(timer)
      mapLive.remove()
      mapPred.remove()
    }
  }, [mapLoaded, geoJsonData, activeModel, params])

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dadad3',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Map size={20} style={{ color: '#e60023' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#262622' }}>
          Live vs. Predicted Heatmaps (District-Wide State Analysis)
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '380px' }}>
        {/* Live Map Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>🟢 Live State Dashboard</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Last sync: real-time</span>
          </div>
          <div id="leaflet-live-map-container" style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            {(!mapLoaded || !geoJsonData) && (
              <div style={{ position: 'absolute', inset: 0, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748b' }}>
                Loading live maps...
              </div>
            )}
          </div>
        </div>

        {/* Predicted Map Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e60023' }}>🔮 ML Predicted State</span>
            <span style={{ fontSize: '11px', color: '#e60023', fontWeight: 700 }}>Hyperparameters Applied</span>
          </div>
          <div id="leaflet-predicted-map-container" style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            {(!mapLoaded || !geoJsonData) && (
              <div style={{ position: 'absolute', inset: 0, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#64748b' }}>
                Loading prediction maps...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
