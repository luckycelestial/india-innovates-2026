'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { KspIncident } from '@/lib/ksp/mockData'
import { runStDbscan, detectMoSeriesInCluster } from '@/lib/ksp/clustering'
import { normalizeDistrictName } from '@/lib/utils/district'

declare global {
  interface Window {
    L: any
  }
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

type CrimeLeafletMapProps = { 
  incidents: KspIncident[]
  selectedDistrict: string
  timeOfDayFilter: 'all' | 'day' | 'night'
  onSelectDistrict: (district: string) => void
  onSelectIncident?: (incidentId: string) => void
  heatmapType: string
  aqiData: any[]
  districts: any[]
  trafficData: any[]
}

const formatDate = (dateStr: string | number): string => {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CrimeLeafletMap({ 
  incidents, 
  selectedDistrict,
  timeOfDayFilter,
  onSelectDistrict,
  onSelectIncident,
  heatmapType,
  aqiData,
  districts,
  trafficData
}: CrimeLeafletMapProps) {
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

    const container = document.getElementById('ksp-map-container')
    if (!container) return
    container.innerHTML = '<div id="ksp-actual-map" style="height: 100%; width: 100%; border-radius: 16px;"></div>'

    const L = window.L
    
    // Build district lookups dynamically from database data
    const DISTRICT_COORDS: Record<string, [number, number]> = {}
    const tempPerDistrict: Record<string, number> = {}
    const civicPerDistrict: Record<string, number> = {}
    const aqiPerDistrict: Record<string, number> = {}

    districts.forEach(d => {
      const key = normalizeDistrictName(d.name)
      DISTRICT_COORDS[key] = [d.latitude, d.longitude]
      tempPerDistrict[key] = d.temp
      civicPerDistrict[key] = d.civic_complaints
      aqiPerDistrict[key] = 85 // Fallback value
    })

    if (heatmapType === 'aqi' && aqiData.length > 0) {
      aqiData.forEach(item => {
        const key = normalizeDistrictName(item.name)
        aqiPerDistrict[key] = item.aqi
      })
    }

    // Center on state of Karnataka by default, otherwise zoom in on the specific district
    const defaultCoords: [number, number] = selectedDistrict === 'all' 
      ? [15.013923, 76.193331] 
      : (DISTRICT_COORDS[normalizeDistrictName(selectedDistrict)] || [12.9716, 77.5946])
    const zoomLevel = selectedDistrict === 'all' ? 7.60 : 11
    const map = L.map('ksp-actual-map', {
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
        let fillClr = '#7B8F65'

        if (heatmapType === 'traffic') {
          const dTraffic = trafficData?.find((t: any) => normalizeDistrictName(t.district_name) === normalizedName)
          const val = dTraffic ? dTraffic.congestion_score : 10
          if (val >= 50) fillClr = '#ef4444' // Heavy
          else if (val >= 25) fillClr = '#f97316' // Moderate
          else if (val >= 10) fillClr = '#eab308' // Minor
          else fillClr = '#7B8F65' // Light
        } else if (heatmapType === 'aqi') {
          const val = aqiPerDistrict[normalizedName] || 50
          if (val >= 150) fillClr = '#ef4444'
          else if (val >= 100) fillClr = '#f97316'
          else if (val >= 50) fillClr = '#eab308'
          else fillClr = '#7B8F65'
        } else if (heatmapType === 'weather') {
          const val = tempPerDistrict[normalizedName] || 25
          if (val >= 32) fillClr = '#ef4444'
          else if (val >= 28) fillClr = '#f97316'
          else if (val >= 24) fillClr = '#eab308'
          else fillClr = '#6D9998'
        } else if (heatmapType === 'incidents') {
          const val = civicPerDistrict[normalizedName] || 0
          if (val >= 10) fillClr = '#ef4444'
          else if (val >= 5) fillClr = '#f97316'
          else if (val >= 2) fillClr = '#eab308'
          else fillClr = '#7B8F65'
        } else {
          const count = crimeCountsPerDistrict[normalizedName] || 0
          if (count >= 4) fillClr = '#ef4444'
          else if (count === 3) fillClr = '#f97316'
          else if (count === 2) fillClr = '#eab308'
          else if (count === 1) fillClr = '#6D9998'
          else fillClr = '#7B8F65'
        }
        
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

        let popupLabel = ''
        if (heatmapType === 'traffic') {
          const dTraffic = trafficData?.find((t: any) => normalizeDistrictName(t.district_name) === normalizedName)
          if (dTraffic) {
            popupLabel = `Traffic Congestion: <strong>${dTraffic.congestion_score}%</strong> (${dTraffic.congestion_score >= 50 ? 'Heavy' : dTraffic.congestion_score >= 25 ? 'Moderate' : 'Light'})<br/>Road: <strong>${dTraffic.road_name}</strong><br/>Speed: <strong>${dTraffic.current_speed} km/h</strong> (Free: ${dTraffic.free_flow_speed} km/h)`
          } else {
            popupLabel = 'No live traffic data logged'
          }
        } else if (heatmapType === 'aqi') {
          const val = aqiPerDistrict[normalizedName] || 50
          popupLabel = `AQI Index: <strong>${val}</strong> (${val > 150 ? 'Poor' : val > 100 ? 'Moderate' : 'Good'})`
        } else if (heatmapType === 'weather') {
          const val = tempPerDistrict[normalizedName] || 25
          popupLabel = `Temperature: <strong>${val}°C</strong> | Rain: <strong>${val > 30 ? '0.0' : '2.4'} mm</strong>`
        } else if (heatmapType === 'incidents') {
          const val = civicPerDistrict[normalizedName] || 0
          popupLabel = `Civic Grievances: <strong>${val} cases logged</strong>`
        } else {
          popupLabel = `Active Crimes: <strong>${count} cases</strong>`
        }

        layer.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 140px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
              📍 ${dName} Limit
            </h4>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
              <span>${popupLabel}</span>
            </div>
          </div>
        `)
      }
    }).addTo(map)

    // Fit bounds of the GeoJSON layer to fit the state/district stretch perfectly in vertical viewport
    fitTimer = setTimeout(() => {
      try {
        map.invalidateSize()
        if (selectedDistrict === 'all') {
          map.setView([15.013923, 76.193331], 7.60)
        } else if (geoJsonLayer.getLayers().length > 0) {
          map.fitBounds(geoJsonLayer.getBounds(), { padding: [5, 5] })
        }
      } catch (err) {
        console.error('Failed to fit bounds:', err)
      }
    }, 200)

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
    if (heatmapType === 'crime') {
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
              <span>Duration: <strong>${formatDate(c.startTime)} - ${formatDate(c.endTime)}</strong></span>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #dadad3;">
                <span style="font-weight: 700; color: #6d28d9;">Detected MO Series:</span><br/>
                <span style="color: #262622; line-height: 1.4; display: block; margin-top: 2px;">${seriesText}</span>
              </div>
            </div>
          </div>
        `)
      })
    }

    // Filter and plot crime hotspots or custom sensor points
    if (heatmapType === 'crime') {
      incidents.forEach(inc => {
        const hour = new Date(inc.date_time).getHours()
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
    } else if (heatmapType === 'traffic') {
      const points = trafficData.length > 0 ? trafficData.map(item => {
        const coords = DISTRICT_COORDS[normalizeDistrictName(item.district_name)] || [12.9716, 77.5946]
        return {
          name: `${item.district_name} Traffic Node`,
          coords,
          congestion: item.congestion_score,
          speed: item.current_speed,
          road: item.road_name
        }
      }) : []
      points.forEach(pt => {
        const color = pt.congestion >= 50 ? '#ef4444' : pt.congestion >= 25 ? '#f97316' : '#7B8F65'
        const circleObj = L.circle(pt.coords as any, {
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          radius: 3500
        }).addTo(map)
        circleObj.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 160px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #262622;">🚗 Traffic: ${pt.name}</h4>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
              <span>Congestion Index: <strong>${pt.congestion}%</strong></span>
              <span>Speed: <strong>${pt.speed} km/h</strong></span>
              <span>Road Link: <strong>${pt.road}</strong></span>
            </div>
          </div>
        `)
      })
    } else if (heatmapType === 'aqi') {
      const stations = aqiData.length > 0 ? aqiData.map(item => {
        const coords = DISTRICT_COORDS[normalizeDistrictName(item.name)] || [12.9716, 77.5946]
        return {
          name: `${item.name} Station`,
          coords,
          aqi: item.aqi
        }
      }) : [
        { name: 'KSPCB Bengaluru Central', coords: [12.9716, 77.5946], aqi: 142 },
        { name: 'IMD Mysuru Hub', coords: [12.2958, 76.6394], aqi: 58 },
        { name: 'Dharwad Industrial Node', coords: [15.3524, 75.1381], aqi: 88 },
        { name: 'Belagavi Fort Sensor', coords: [15.8497, 74.4977], aqi: 110 },
        { name: 'Mangaluru Port Sensor', coords: [12.9141, 74.8560], aqi: 35 }
      ]
      stations.forEach(st => {
        const circleObj = L.circle(st.coords as any, {
          color: '#8b5cf6',
          fillColor: '#8b5cf6',
          fillOpacity: 0.6,
          radius: 2500
        }).addTo(map)
        circleObj.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 150px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #262622;">🌬️ AQI station: ${st.name}</h4>
            <div style="font-size: 11px;">AQI index: <strong>${st.aqi}</strong></div>
          </div>
        `)
      })
    } else if (heatmapType === 'weather') {
      const stations = [
        { name: 'IMD Bengaluru Command', coords: [12.9716, 77.5946], temp: 24.2, conditions: 'Rain Alert' },
        { name: 'IMD Mysuru Hub', coords: [12.2958, 76.6394], temp: 26.5, conditions: 'Partly Cloudy' },
        { name: 'IMD Hubballi Sensor', coords: [15.3524, 75.1381], temp: 27.8, conditions: 'Sunny' },
        { name: 'IMD Mangaluru Coastal', coords: [12.9141, 74.8560], temp: 32.1, conditions: 'Humid' }
      ]
      stations.forEach(st => {
        const circleObj = L.circle(st.coords as any, {
          color: '#0ea5e9',
          fillColor: '#0ea5e9',
          fillOpacity: 0.6,
          radius: 3000
        }).addTo(map)
        circleObj.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 150px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #262622;">🌦️ Weather Hub: ${st.name}</h4>
            <div style="font-size: 11px;">Temp: <strong>${st.temp}°C</strong> | Conditions: <strong>${st.conditions}</strong></div>
          </div>
        `)
      })
    } else if (heatmapType === 'incidents') {
      const incidentsList = [
        { desc: 'Water pipeline burst', coords: [12.96, 77.58], category: 'Water & Sewerage' },
        { desc: 'Garbage dump overflow', coords: [12.98, 77.61], category: 'Solid Waste' },
        { desc: 'Blocked storm drain', coords: [12.94, 77.57], category: 'Water & Sewerage' },
        { desc: 'Major road pothole', coords: [12.29, 76.64], category: 'Roads & Lights' },
        { desc: 'Vandalized street lamps', coords: [15.35, 75.14], category: 'Roads & Lights' }
      ]
      incidentsList.forEach(inc => {
        const circleObj = L.circle(inc.coords as any, {
          color: '#ea580c',
          fillColor: '#ea580c',
          fillOpacity: 0.6,
          radius: 2000
        }).addTo(map)
        circleObj.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 150px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #262622;">🚨 Civic Incident</h4>
            <div style="font-size: 11px;">Details: <strong>${inc.desc}</strong></div>
          </div>
        `)
      })
    }

    return () => {
      if (fitTimer) clearTimeout(fitTimer)
      map.remove()
    }
  }, [mapLoaded, geoJsonData, incidents, selectedDistrict, timeOfDayFilter, onSelectIncident, heatmapType, aqiData, districts, trafficData])

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
          fontWeight: 600,
          zIndex: 10
        }}>
          Loading Map overlays...
        </div>
      )}
      <div id="ksp-map-container" style={{ flex: 1, width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-5 left-5 bg-white border border-[#dadad3] rounded-2xl p-3 shadow-md w-[150px] font-sans" style={{ zIndex: 500 }}>
        <div className="text-[11px] font-bold text-[#262622] mb-2 uppercase tracking-[0.5px]">
          {heatmapType === 'traffic' ? 'Traffic Congestion' : heatmapType === 'aqi' ? 'AQI Levels' : heatmapType === 'weather' ? 'Temperature' : heatmapType === 'incidents' ? 'Civic Incidents' : 'Crime Density'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(heatmapType === 'traffic' ? [
            { label: 'Heavy (50%+)', color: '#ef4444' },
            { label: 'Moderate (25-50%)', color: '#f97316' },
            { label: 'Minor (10-25%)', color: '#eab308' },
            { label: 'Light (<10%)', color: '#7B8F65' }
          ] : heatmapType === 'aqi' ? [
            { label: 'Poor (150+)', color: '#ef4444' },
            { label: 'Moderate (100-150)', color: '#f97316' },
            { label: 'Satisfactory (50-100)', color: '#eab308' },
            { label: 'Good (<50)', color: '#7B8F65' }
          ] : heatmapType === 'weather' ? [
            { label: 'Hot (>32°C)', color: '#ef4444' },
            { label: 'Warm (28-32°C)', color: '#f97316' },
            { label: 'Mild (24-28°C)', color: '#eab308' },
            { label: 'Cool (<24°C)', color: '#6D9998' }
          ] : heatmapType === 'incidents' ? [
            { label: 'Heavy (>10)', color: '#ef4444' },
            { label: 'Moderate (5-10)', color: '#f97316' },
            { label: 'Light (2-5)', color: '#eab308' },
            { label: 'Minimal (<2)', color: '#7B8F65' }
          ] : [
            { label: 'Very High', color: '#ef4444' },
            { label: 'High', color: '#f97316' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#6D9998' },
            { label: 'Very Low', color: '#7B8F65' }
          ]).map(item => (
            <div key={item.label} className="flex items-center gap-2 text-[11px] font-semibold text-[#262622]">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated Overlay */}
      <div className="absolute bottom-5 right-5 bg-white border border-[#dadad3] rounded-2xl py-2 px-3 shadow-md flex items-center gap-1.5 font-sans text-[11px] text-[#262622] font-semibold" style={{ zIndex: 500 }}>
        <Clock size={12} />
        <span>Last Updated Today, 08:30 AM</span>
      </div>
    </div>
  )
}
