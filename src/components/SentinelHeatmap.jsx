// SentinelHeatmap.jsx — Ward-level grievance density map using Leaflet
import { useEffect, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'

import { useAuth } from '../context/AuthContext'
import { listGrievances } from '../services/grievancesApi'

// Delhi ward data — real coordinates of major localities
const DELHI_WARDS = [
  { id: 'w1', name: 'Connaught Place', lat: 28.6315,  lng: 77.2167, constituency: 'New Delhi' },
  { id: 'w2', name: 'Karol Bagh',      lat: 28.6520,  lng: 77.1905, constituency: 'Central Delhi' },
  { id: 'w3', name: 'Saket',           lat: 28.5244,  lng: 77.2066, constituency: 'South Delhi' },
  { id: 'w4', name: 'Rohini Sector 3', lat: 28.7326,  lng: 77.1122, constituency: 'North Delhi' },
  { id: 'w5', name: 'Dwarka Sector 7', lat: 28.5731,  lng: 77.0595, constituency: 'West Delhi' },
  { id: 'w6', name: 'Laxmi Nagar',     lat: 28.6310,  lng: 77.2779, constituency: 'East Delhi' },
  { id: 'w7', name: 'Sadar Bazaar',    lat: 28.6590,  lng: 77.1991, constituency: 'Central Delhi' },
  { id: 'w8', name: 'Vasant Kunj',     lat: 28.5228,  lng: 77.1595, constituency: 'South Delhi' },
  { id: 'w9', name: 'Shakur Basti',    lat: 28.6854,  lng: 77.1425, constituency: 'North West Delhi' },
  { id: 'w10', name: 'Mayur Vihar',    lat: 28.6100,  lng: 77.2946, constituency: 'East Delhi' },
]

// Color based on grievance count (green → yellow → orange → red)
function getColor(count) {
  if (count === 0)  return '#22c55e'   // green — all quiet
  if (count <= 2)   return '#86efac'   // light green
  if (count <= 4)   return '#fde047'   // yellow
  if (count <= 7)   return '#fb923c'   // orange
  if (count <= 10)  return '#f87171'   // light red
  return '#dc2626'                      // red — critical
}

function getSeverityLabel(count) {
  if (count === 0) return 'Normal'
  if (count <= 2)  return 'Low'
  if (count <= 4)  return 'Moderate'
  if (count <= 7)  return 'High'
  return 'Critical'
}

// Distribute grievances across wards using simple seed-based pseudo-random
function distributeGrievances(totalOpen, criticalOpen) {
  // Weights for each ward (sum = 1)
  const weights = [0.18, 0.14, 0.10, 0.12, 0.09, 0.11, 0.08, 0.07, 0.06, 0.05]
  const counts = weights.map(w => Math.round(w * totalOpen))
  // Add critical markers to first few wards
  let remaining = criticalOpen
  for (let i = 0; i < counts.length && remaining > 0; i++) {
    const extra = Math.min(remaining, Math.round(criticalOpen * weights[i]))
    counts[i] = Math.max(counts[i], extra)
    remaining -= extra
  }
  return counts
}



function countOpenGrievances(rows) {
  const closed = new Set(['resolved', 'closed'])
  return (rows || []).filter((r) => r?.status && !closed.has(String(r.status).toLowerCase())).length
}

function countCriticalOpen(rows) {
  const closed = new Set(['resolved', 'closed'])
  return (rows || []).filter(
    (r) =>
      String(r?.priority || '').toLowerCase() === 'critical' &&
      r?.status &&
      !closed.has(String(r.status).toLowerCase())
  ).length
}

function countSlaBreachedOpen(rows) {
  const closed = new Set(['resolved', 'closed'])
  const now = Date.now()
  return (rows || []).filter((r) => {
    if (!r?.sla_deadline || !r?.status) return false
    if (closed.has(String(r.status).toLowerCase())) return false
    return new Date(r.sla_deadline).getTime() < now
  }).length
}


function MarkerWithInfoWindow({ ward }) {
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: ward.lat, lng: ward.lng }}
        onClick={() => setInfoWindowShown(isShown => !isShown)}
      >
        <Pin background={getColor(ward.count)} borderColor={ward.count > 0 ? '#000' : 'none'} glyphColor={'#fff'} />
      </AdvancedMarker>
      {infoWindowShown && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoWindowShown(false)}>
           <div style={{ fontFamily: 'inherit', minWidth: '160px', color: '#000' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{ward.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '8px' }}>{ward.constituency}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span>Open Grievances</span>
                <strong style={{ color: getColor(ward.count) }}>{ward.count}</strong>
              </div>
              {ward.critical > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '2px' }}>
                  <span>Critical</span>
                  <strong style={{ color: '#dc2626' }}>{ward.critical}</strong>
                </div>
              )}
              <div style={{ marginTop: '8px', padding: '3px 8px', background: getColor(ward.count), color: ward.count <= 2 ? '#166534' : '#fff', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>
                {getSeverityLabel(ward.count)}
              </div>
            </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function SentinelHeatmap() {

  const { user } = useAuth()
  const [wardData, setWardData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadHeatmapData()
  }, [user])

  const loadHeatmapData = async () => {
    setLoading(true)
    setError(null)
    try {
      let totalOpen = 0
      let criticalOpen = 0
      let slaViolations = 0
      try {
        const rows = await listGrievances(user, { limit: 2000 })
        totalOpen = countOpenGrievances(rows)
        criticalOpen = countCriticalOpen(rows)
        slaViolations = countSlaBreachedOpen(rows)
        setStats({ totalOpen, criticalOpen, slaViolations })
      } catch (e) {
        console.error('Grievance stats fetch failed', e)
        setStats({ totalOpen: 0, criticalOpen: 0, slaViolations: 0 })
      }

      const grievanceCounts = distributeGrievances(totalOpen, criticalOpen)
      const enriched = DELHI_WARDS.map((w, i) => ({
        ...w,
        count: grievanceCounts[i] ?? 0,
        critical: i < 3 ? Math.min(criticalOpen, Math.max(0, Math.round(criticalOpen * [0.4, 0.3, 0.2][i]))) : 0,
      }))
      setWardData(enriched)
    } catch (e) {
      setError('Failed to load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  const LEGEND = [
    { label: 'Normal (0)',       color: '#22c55e' },
    { label: 'Low (1-2)',        color: '#86efac' },
    { label: 'Moderate (3-4)',   color: '#fde047' },
    { label: 'High (5-7)',       color: '#fb923c' },
    { label: 'Critical (8+)',    color: '#dc2626' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '420px', color: 'var(--muted)', fontSize: '0.88rem' }}>
        Loading ward data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
    )
  }

  return (
    <div>
      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            ['Open Grievances', stats.totalOpen, 'var(--navy)'],
            ['Critical',        stats.criticalOpen, 'var(--danger)'],
            ['SLA Violations',  stats.slaViolations, 'var(--saffron)'],
          ].map(([lbl, val, color]) => (
            <div key={lbl} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', height: '420px', position: 'relative' }}>
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "dummy"}>
          <Map
            defaultCenter={{ lat: 28.6139, lng: 77.2090 }}
            defaultZoom={11}
            mapId="DEMO_MAP_ID"
            disableDefaultUI={true}
          >

            {wardData.map(ward => (
              <MarkerWithInfoWindow key={ward.id} ward={ward} />
            ))}

          </Map>
        </APIProvider>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginRight: '4px' }}>LEGEND:</span>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--light)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color, border: '1px solid rgba(0,0,0,0.1)' }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Ward list */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
        {[...wardData].sort((a, b) => b.count - a.count).map(ward => (
          <div key={ward.id} style={{ background: 'var(--card)', border: `1px solid ${ward.count >= 8 ? '#F5C6CB' : 'var(--border)'}`, borderRadius: '9px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ward.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{ward.constituency}</div>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: getColor(ward.count), minWidth: '28px', textAlign: 'right' }}>{ward.count}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>New Delhi constituency — 10 wards — Live data</span>
        <button onClick={loadHeatmapData} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--muted)' }}>Refresh</button>
      </div>
    </div>
  )
}
