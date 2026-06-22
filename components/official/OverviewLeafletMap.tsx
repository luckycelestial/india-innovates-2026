'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { normalizeDistrictName } from '@/lib/utils/district'

// Declare Leaflet globally
declare global {
  interface Window {
    L: any
  }
}

export type HeatmapMetric = 'overall' | 'civic' | 'crime' | 'aqi' | 'traffic' | 'temp' | 'rain'

export interface ProcessedDistrict {
  name: string
  latitude: number
  longitude: number

  // Raw metrics
  civicComplaints: number
  crimesCount: number
  aqi: number
  congestion: number
  temp: number
  rain: number

  // Normalized scores (0-100)
  civicScore: number
  crimeScore: number
  aqiScore: number
  trafficScore: number
  tempScore: number
  rainScore: number
  overallScore: number

  // State ranks (1-30)
  civicRank: number
  crimeRank: number
  aqiRank: number
  trafficRank: number
  tempRank: number
  rainRank: number
  overallRank: number
}

interface OverviewLeafletMapProps {
  districtsData: ProcessedDistrict[]
  selectedDistrict: ProcessedDistrict | null
  onSelectDistrict: (name: string) => void
  heatmapType: HeatmapMetric
}

export default function OverviewLeafletMap({
  districtsData,
  selectedDistrict,
  onSelectDistrict,
  heatmapType
}: OverviewLeafletMapProps) {
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

    const container = document.getElementById('overview-map-container')
    if (!container) return
    container.innerHTML = '<div id="overview-actual-map" style="height: 100%; width: 100%; border-radius: 16px;"></div>'

    const L = window.L

    const DISTRICT_COORDS: Record<string, [number, number]> = {}
    const dataPerDistrict: Record<string, ProcessedDistrict> = {}

    districtsData.forEach(d => {
      const key = normalizeDistrictName(d.name)
      DISTRICT_COORDS[key] = [d.latitude, d.longitude]
      dataPerDistrict[key] = d
    })

    const defaultCoords: [number, number] = !selectedDistrict
      ? [15.013923, 76.193331]
      : [selectedDistrict.latitude, selectedDistrict.longitude]
    const zoomLevel = !selectedDistrict ? 7.60 : 10.5
    const map = L.map('overview-actual-map', {
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: true
    }).setView(defaultCoords, zoomLevel)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    const getFillColor = (dName: string) => {
      const d = dataPerDistrict[dName]
      if (!d) return '#dadad3'

      if (heatmapType === 'civic') {
        const val = d.civicComplaints
        if (val >= 12) return '#ef4444' // red
        if (val >= 6) return '#f97316'  // orange
        if (val >= 3) return '#eab308'  // yellow
        return '#3b82f6'                 // blue
      } else if (heatmapType === 'crime') {
        const val = d.crimesCount
        if (val >= 6) return '#7e22ce'  // purple
        if (val >= 3) return '#ef4444'  // red
        if (val >= 2) return '#f97316'  // orange
        if (val >= 1) return '#eab308'  // yellow
        return '#10b981'                 // green
      } else if (heatmapType === 'aqi') {
        const val = d.aqi
        if (val >= 150) return '#7e22ce'
        if (val >= 100) return '#ef4444'
        if (val >= 80) return '#f97316'
        if (val >= 50) return '#eab308'
        return '#10b981'
      } else if (heatmapType === 'traffic') {
        const val = d.congestion
        if (val >= 60) return '#ef4444'
        if (val >= 40) return '#f97316'
        if (val >= 20) return '#eab308'
        return '#10b981'
      } else if (heatmapType === 'temp') {
        const val = d.temp
        if (val >= 32) return '#ef4444'
        if (val >= 28) return '#f97316'
        if (val >= 24) return '#eab308'
        if (val >= 20) return '#6d9998'
        return '#3b82f6'
      } else if (heatmapType === 'rain') {
        const val = d.rain
        if (val > 5.0) return '#1d4ed8'
        if (val > 2.0) return '#3b82f6'
        if (val > 0.0) return '#93c5fd'
        return '#dadad3'
      } else { // overall
        const val = d.overallScore
        if (val >= 55) return '#7e22ce'
        if (val >= 40) return '#ef4444'
        if (val >= 25) return '#f97316'
        if (val >= 12) return '#eab308'
        return '#10b981'
      }
    }

    const geoJsonLayer = L.geoJSON(geoJsonData, {
      filter: (feature: any) => {
        if (!selectedDistrict) return true
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        return normalizeDistrictName(selectedDistrict.name) === normalizedName
      },
      style: (feature: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const isSelected = selectedDistrict && normalizeDistrictName(selectedDistrict.name) === normalizedName

        return {
          color: isSelected ? '#36375D' : '#ffffff',
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 170px; padding: 6px;">
              <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                📍 ${d.name}
              </h4>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #475569;">
                <span>Overall Stress Rank: <strong>#${d.overallRank}</strong></span>
                <span>Civic Complaints: <strong>${d.civicComplaints}</strong> (Rank #${d.civicRank})</span>
                <span>Crime Cases: <strong>${d.crimesCount}</strong> (Rank #${d.crimeRank})</span>
                <span>AQI: <strong>${d.aqi}</strong> (Rank #${d.aqiRank})</span>
                <span>Traffic Congestion: <strong>${d.congestion}%</strong> (Rank #${d.trafficRank})</span>
                <span>Temperature: <strong>${d.temp.toFixed(1)}°C</strong></span>
                <span>Rainfall: <strong>${d.rain.toFixed(1)} mm</strong></span>
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
          map.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] })
        }
      } catch (err) {
        console.error('Failed to fit bounds:', err)
      }
    }, 200)

    return () => {
      if (fitTimer) clearTimeout(fitTimer)
      map.remove()
    }
  }, [mapLoaded, geoJsonData, districtsData, selectedDistrict, heatmapType])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
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
      <div id="overview-map-container" style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>

      {selectedDistrict && (
        <button
          onClick={() => onSelectDistrict('')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 2000,
            background: '#ffffff',
            border: '2px solid #36375D',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#36375D',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(54,55,93,0.15)',
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
          {heatmapType === 'overall' ? 'Stress index' : heatmapType === 'civic' ? 'Civic Complaints' : heatmapType === 'crime' ? 'Crime Cases' : heatmapType === 'aqi' ? 'AQI Levels' : heatmapType === 'traffic' ? 'Traffic Congestion' : heatmapType === 'temp' ? 'Temperature' : 'Precipitation'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(heatmapType === 'overall' ? [
            { label: 'Severe Stress (>55)', color: '#7e22ce' },
            { label: 'High Stress (40-55)', color: '#ef4444' },
            { label: 'Moderate (25-40)', color: '#f97316' },
            { label: 'Minor (12-25)', color: '#eab308' },
            { label: 'Normal (<12)', color: '#10b981' }
          ] : heatmapType === 'civic' ? [
            { label: 'Critical (>12)', color: '#ef4444' },
            { label: 'Elevated (6-12)', color: '#f97316' },
            { label: 'Moderate (3-6)', color: '#eab308' },
            { label: 'Minimal (<3)', color: '#3b82f6' }
          ] : heatmapType === 'crime' ? [
            { label: 'Severe (>6 cases)', color: '#7e22ce' },
            { label: 'High (3-6 cases)', color: '#ef4444' },
            { label: 'Medium (2-3 cases)', color: '#f97316' },
            { label: 'Low (1-2 cases)', color: '#eab308' },
            { label: 'None (0)', color: '#10b981' }
          ] : heatmapType === 'aqi' ? [
            { label: 'Hazardous (>150)', color: '#7e22ce' },
            { label: 'Poor (100-150)', color: '#ef4444' },
            { label: 'Moderate (80-100)', color: '#f97316' },
            { label: 'Fair (50-80)', color: '#eab308' },
            { label: 'Good (<50)', color: '#10b981' }
          ] : heatmapType === 'traffic' ? [
            { label: 'Severe (>60%)', color: '#ef4444' },
            { label: 'High (40-60%)', color: '#f97316' },
            { label: 'Moderate (20-40%)', color: '#eab308' },
            { label: 'Light (<20%)', color: '#10b981' }
          ] : heatmapType === 'temp' ? [
            { label: 'Hot (>32°C)', color: '#ef4444' },
            { label: 'Warm (28-32°C)', color: '#f97316' },
            { label: 'Mild (24-28°C)', color: '#eab308' },
            { label: 'Cool (20-24°C)', color: '#6d9998' },
            { label: 'Cold (<20°C)', color: '#3b82f6' }
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
