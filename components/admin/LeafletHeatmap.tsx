'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { normalizeDistrictName, getComplaintDistrict } from '@/lib/utils/district'

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

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

type LeafletHeatmapProps = { 
  complaints: Complaint[]
  selectedDistrict: string
  onSelectDistrict: (district: string) => void
  districts: any[]
}

export default function LeafletHeatmap({ 
  complaints, 
  selectedDistrict, 
  onSelectDistrict, 
  districts 
}: LeafletHeatmapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)

  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
    } else {
      // Load Leaflet CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Load Leaflet JS
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
    const container = document.getElementById('leaflet-map-container')
    if (!container) return
    container.innerHTML = '<div id="actual-map-element" style="height: 100%; width: 100%; border-radius: 16px;"></div>'

    const L = window.L

    // Coordinates mapping for districts
    const DISTRICT_COORDS: Record<string, [number, number]> = {}
    const civicPerDistrict: Record<string, number> = {}

    // Initialize with data from districts table
    districts.forEach(d => {
      const key = normalizeDistrictName(d.name)
      DISTRICT_COORDS[key] = [d.latitude, d.longitude]
      civicPerDistrict[key] = d.civic_complaints || 0
    })

    // Add actual complaints in complaints table
    complaints.forEach(c => {
      const dist = getComplaintDistrict(c.location || '')
      civicPerDistrict[dist] = (civicPerDistrict[dist] || 0) + 1
    })

    // Setup map view
    const defaultCoords: [number, number] = selectedDistrict === 'all'
      ? [15.013923, 76.193331]
      : (DISTRICT_COORDS[normalizeDistrictName(selectedDistrict)] || [12.9716, 77.5946])
    
    const zoomLevel = selectedDistrict === 'all' ? 7.60 : 11

    const map = L.map('actual-map-element', {
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

    // Render district boundaries from GeoJSON
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
        const val = civicPerDistrict[normalizedName] || 0

        let fillClr = '#7B8F65' // Minimal (< 2)
        if (val >= 10) fillClr = '#ef4444' // Heavy
        else if (val >= 5) fillClr = '#f97316' // Moderate
        else if (val >= 2) fillClr = '#eab308' // Light

        return {
          color: '#6D9998',
          weight: 1.5,
          fillColor: fillClr,
          fillOpacity: 0.4
        }
      },
      onEachFeature: (feature: any, layer: any) => {
        const dName = feature.properties.Dist_Name || ''
        const normalizedName = normalizeDistrictName(dName)
        const val = civicPerDistrict[normalizedName] || 0

        layer.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e)
          onSelectDistrict(normalizedName)
        })

        layer.bindPopup(`
          <div style="font-family: ${FONT_SANS}; min-width: 140px; padding: 4px;">
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
              📍 ${dName}
            </h4>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
              <span>Civic Complaints: <strong>${val} tickets logged</strong></span>
            </div>
          </div>
        `)
      }
    }).addTo(map)

    fitTimer = setTimeout(() => {
      try {
        map.invalidateSize()
        if (selectedDistrict === 'all') {
          map.setView([15.013923, 76.193331], 7.60)
        } else if (geoJsonLayer.getLayers().length > 0) {
          map.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] })
        }
      } catch (err) {
        console.error('Failed to fit bounds:', err)
      }
    }, 200)

    // Location coordinates mapping for actual complaints in Bengaluru/others
    const locationCoords: Record<string, [number, number]> = {
      'Ward 12, Main Cross': [12.9796, 77.5906],
      'Ward 5, NH-44 near Petrol Pump': [12.9626, 77.6106],
      'Ward 2, Gandhi Nagar School Road': [12.9816, 77.5746],
      'Ward 9, Block C Metro Layout': [12.9516, 77.5846],
      'Ward 11, 5th Avenue Link Road': [12.9906, 77.6016]
    }

    // Plot individual complaints as circle markers
    complaints.forEach(c => {
      const locName = c.location || 'General/Unknown'
      let coords = locationCoords[locName]
      if (!coords) {
        let hash = 0
        for (let i = 0; i < locName.length; i++) {
          hash = locName.charCodeAt(i) + ((hash << 5) - hash)
        }
        const latOffset = (hash % 100) / 2000
        const lngOffset = ((hash >> 8) % 100) / 2000
        
        // Find center coords of the parent district or default to Bengaluru
        const parentDist = getComplaintDistrict(locName)
        const baseCoords = DISTRICT_COORDS[parentDist] || [12.9716, 77.5946]
        coords = [baseCoords[0] + latOffset, baseCoords[1] + lngOffset]
      }

      // If we filtered by a district, only show markers in that district
      if (selectedDistrict !== 'all') {
        const parentDist = getComplaintDistrict(locName)
        if (parentDist !== normalizeDistrictName(selectedDistrict)) {
          return
        }
      }

      // Color coding for markers
      let color = '#22c55e' // Resolved/Closed
      const isClosed = c.status === 'resolved' || c.status === 'closed'
      
      if (!isClosed) {
        const dueTime = new Date(c.created_at).getTime() + 
          (c.priority === 'urgent' ? 24 : c.priority === 'high' ? 48 : c.priority === 'medium' ? 120 : 168) * 60 * 60 * 1000
        if (Date.now() > dueTime || c.status === 'escalated') {
          color = '#ef4444' // Red (Overdue / Escalated)
        } else {
          color = '#f59e0b' // Yellow/Orange (Active / Pending)
        }
      }

      const radius = 250 // constant radius for individual points since they represent single complaints

      const circle = L.circle(coords, {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: radius
      }).addTo(map)

      circle.bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 180px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #262622; border-bottom: 1px solid #dadad3; padding-bottom: 4px;">
            🚨 ${c.complaint_number}
          </h4>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #262622;">
            <span>Title: <strong>${c.title}</strong></span>
            <span>Category: <strong style="text-transform: capitalize;">${c.category}</strong></span>
            <span>Location: <strong>${c.location}</strong></span>
            <span style="color: ${color}; font-weight: 700;">Status: ${c.status.toUpperCase()}</span>
            <span style="font-weight: 600;">Priority: ${c.priority.toUpperCase()}</span>
          </div>
        </div>
      `)
    })

    return () => {
      if (fitTimer) clearTimeout(fitTimer)
      map.remove()
    }
  }, [mapLoaded, geoJsonData, complaints, selectedDistrict, districts])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }} className="flex flex-col">
      {(!mapLoaded || !geoJsonData) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#f8fafc',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 10
        }}>
          <span className="animate-spin" style={{ marginRight: '8px', border: '2px solid #cbd5e1', borderTopColor: '#024ad8', borderRadius: '50%', width: '16px', height: '16px' }} />
          Loading Leaflet OSM Map...
        </div>
      )}
      <div id="leaflet-map-container" style={{ flex: 1, width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>

      {selectedDistrict && selectedDistrict !== 'all' && (
        <button
          onClick={() => onSelectDistrict('all')}
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
      <div className="absolute bottom-5 left-5 bg-white border border-[#dadad3] rounded-2xl p-3 shadow-md w-[150px] font-sans" style={{ zIndex: 500 }}>
        <div className="text-[11px] font-bold text-[#262622] mb-2 uppercase tracking-[0.5px]">
          Complaints Load
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Heavy (10+)', color: '#ef4444' },
            { label: 'Moderate (5-9)', color: '#f97316' },
            { label: 'Light (2-4)', color: '#eab308' },
            { label: 'Minimal (<2)', color: '#7B8F65' }
          ].map(item => (
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
        <span>Last Sync: Real-time</span>
      </div>
    </div>
  )
}
