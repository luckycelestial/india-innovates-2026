'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
// Removed Supabase client
import { 
  ShieldAlert, MapPin, Clock, Search, RefreshCw, 
  Layers, Compass, Flame, Radio, AlertTriangle
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident, MOCK_PEOPLE, MOCK_CONNECTIONS, KspPerson } from '@/lib/ksp/mockData'
import { runStDbscan, detectMoSeriesInCluster, analyzeTemporalTrends, detectContextualAnomalies } from '@/lib/ksp/clustering'

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

function CrimeLeafletMap({ 
  incidents, 
  selectedDistrict,
  timeOfDayFilter,
  onSelectDistrict,
  onSelectIncident,
  heatmapType,
  aqiData,
  districts
}: { 
  incidents: KspIncident[]
  selectedDistrict: string
  timeOfDayFilter: 'all' | 'day' | 'night'
  onSelectDistrict: (district: string) => void
  onSelectIncident?: (incidentId: string) => void
  heatmapType: string
  aqiData: any[]
  districts: any[]
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
      ? [14.85, 76.2] 
      : (DISTRICT_COORDS[normalizeDistrictName(selectedDistrict)] || [12.9716, 77.5946])
    const zoomLevel = selectedDistrict === 'all' ? 7.8 : 11
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

        if (heatmapType === 'aqi') {
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
        if (heatmapType === 'aqi') {
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
          map.setView([14.85, 76.2], 7.8)
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
        { name: 'Mysuru Eco Sensor', coords: [12.2958, 76.6394], aqi: 58 },
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
  }, [mapLoaded, geoJsonData, incidents, selectedDistrict, timeOfDayFilter, onSelectIncident, heatmapType, aqiData, districts])

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
          {heatmapType === 'aqi' ? 'AQI Levels' : heatmapType === 'weather' ? 'Temperature' : heatmapType === 'incidents' ? 'Civic Incidents' : 'Crime Density'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(heatmapType === 'aqi' ? [
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


function KpiCard({ title, value, subtitle, icon, color }: { title: string, value: any, subtitle: string, icon: any, color: string }) {
  return (
    <div className="bg-white border border-[#dadad3] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className="p-3 rounded-2xl" style={{ background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-[#262622] uppercase tracking-[0.5px]">{title}</div>
        <div className="text-2xl font-bold text-black my-0.5">{value}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
    </div>
  )
}

function CrimeIntelligenceContent() {
  const searchParams = useSearchParams()
  const heatmapType = searchParams.get('type') || 'crime'
  
  const [incidents, setIncidents] = useState<KspIncident[]>(MOCK_INCIDENTS)
  const [loading, setLoading] = useState(false)
  const [aqiData, setAqiData] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])

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
  }, [])

  const districtCoords = useMemo(() => {
    const coords: Record<string, [number, number]> = {}
    districts.forEach(d => {
      coords[d.name] = [d.latitude, d.longitude]
    })
    return coords
  }, [districts])

  const aqiListToRender = aqiData

  const aqiStats = useMemo(() => {
    if (aqiData.length === 0) {
      return { avg: 0, maxVal: 0, maxStation: 'N/A', minVal: 0, minStation: 'N/A', count: 0 }
    }
    const count = aqiData.length
    const sum = aqiData.reduce((acc, d) => acc + d.aqi, 0)
    const avg = Math.round(sum / count)
    const sorted = [...aqiData].sort((a, b) => b.aqi - a.aqi)
    const maxVal = sorted[0].aqi
    const maxStation = sorted[0].name
    const minVal = sorted[sorted.length - 1].aqi
    const minStation = sorted[sorted.length - 1].name
    return { avg, maxVal, maxStation, minVal, minStation, count }
  }, [aqiData])

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
              {heatmapType === 'aqi' ? 'AQI Telemetry Heatmap' : heatmapType === 'weather' ? 'Weather & Temperature Grid' : heatmapType === 'incidents' ? 'Civic Incident Density' : 'Crime-Specific Hotspots'}
            </h1>
            <p style={{ fontSize: '14px', color: '#262622', marginTop: '4px' }}>
              {heatmapType === 'aqi' ? 'Air Quality index sensor data across Karnataka state' : heatmapType === 'weather' ? 'Live regional temperature and rain conditions' : heatmapType === 'incidents' ? 'Density of citizen complaints and public infrastructure reports' : 'Select a crime type to view complaints density by district'}
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
          {heatmapType === 'aqi' ? (
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
        {heatmapType !== 'aqi' && spikes.length > 0 && (
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
          <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col flex-[2_1_600px] min-w-[320px]">
            <div className="flex-1 w-full bg-[#f6f6f3] rounded-2xl overflow-hidden shadow-md border border-[#dadad3] relative min-h-[760px] flex flex-col">
              <CrimeLeafletMap 
                incidents={filtered} 
                selectedDistrict={districtFilter}
                timeOfDayFilter={timeOfDayFilter}
                onSelectDistrict={setDistrictFilter}
                onSelectIncident={setSelectedIncidentId}
                heatmapType={heatmapType}
                aqiData={aqiData}
                districts={districts}
              />
            </div>
          </div>

          {/* Right Side: Details Panel */}
          <div className="bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-5 flex-[1_1_320px] min-w-[300px]">
            {heatmapType === 'aqi' ? (
              <div className="flex flex-col gap-5">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid #dadad3', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '20px', color: '#000000' }}>
                      AQI Sensor Readings
                    </h3>
                    <span style={{ fontSize: '11px', color: '#262622', fontWeight: 600 }}>MYSQL DATABASE LEDGER</span>
                  </div>
                  <span style={{
                    background: '#dcfce7',
                    color: '#6D9998',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px'
                  }}>
                    Live
                  </span>
                </div>

                {/* Table of Live Readings */}
                <div className="overflow-x-auto border border-[#dadad3] rounded-2xl bg-white p-3">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#dadad3] text-[#555550] font-bold">
                        <th className="p-2">Station</th>
                        <th className="p-2">AQI</th>
                        <th className="p-2">PM2.5</th>
                        <th className="p-2">PM10</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aqiListToRender.map((row: any) => {
                        const status = getAqiStatus(row.aqi)
                        return (
                          <tr key={row.stationId} className="border-b border-[#f6f6f3]">
                            <td className="p-2 font-bold">{row.name}</td>
                            <td className="p-2 font-bold" style={{ color: row.aqi > 100 ? '#ef4444' : '#7B8F65' }}>{row.aqi}</td>
                            <td className="p-2">{row.pm25}</td>
                            <td className="p-2">{row.pm10}</td>
                            <td className="p-2">
                              <span className="text-[10px] py-0.5 px-1.5 rounded font-bold" style={{ background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)', color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65' }}>{status}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sync Trigger button to hit POST /api/aqi */}
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
                  className="h-10 rounded-2xl border-none bg-[#36375D] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(54,55,93,0.15)] transition-all duration-150"
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

        {/* Police Station details / AQI listing */}
        <div id="station-logs-section" className="bg-white rounded-2xl border border-[#dadad3] shadow-sm overflow-hidden">
          <div className="py-5 px-6 border-b border-[#dadad3] flex justify-between items-center">
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', margin: 0 }}>
              {heatmapType === 'aqi' ? 'Air Quality Index (AQI) Telemetry' : 'Jurisdiction / Station Metrics'}
            </h3>
            {heatmapType === 'aqi' && (
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>MySQL Database Ledger</span>
            )}
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
                    <th className="py-4 pl-8 pr-4 bg-[#f6f6f3]">Case Number</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Category</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Station</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">District</th>
                    <th className="py-4 px-4 bg-[#f6f6f3]">Time of Day</th>
                    <th className="py-4 pl-4 pr-8 text-right bg-[#f6f6f3]">Threat Index</th>
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
                      <td className="py-4 pl-8 pr-4 font-bold text-black">{inc.case_number}</td>
                      <td className="py-4 px-4 capitalize">{inc.category}</td>
                      <td className="py-4 px-4">{inc.police_station}</td>
                      <td className="py-4 px-4">{inc.district}</td>
                      <td className="py-4 px-4">{formatTime(inc.date_time)}</td>
                      <td className="py-4 pl-4 pr-8 text-right font-semibold">{inc.risk_score}</td>
                    </tr>
                  ))}
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
