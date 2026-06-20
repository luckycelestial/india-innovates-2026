'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { 
  MapPin, Bell, Search, Compass, CheckCircle2, ChevronRight, User, 
  TrendingUp, BarChart3, Settings, Kanban, ClipboardList, Filter, X, 
  Plus, AlertTriangle, ShieldAlert, Thermometer, Wind, Car, RefreshCw, 
  Layers, Map, FileSpreadsheet, Eye, Info, Check, Send, AlertCircle, Calendar 
} from 'lucide-react'

// Types
type Comment = {
  sender: string
  text: string
  time: string
}

type Grievance = {
  id: string
  citizen: string
  category: string
  ward: string
  urgency: 'Urgent' | 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Progress' | 'Resolved'
  assignedAgent: string
  assignedDept: string
  date: string
  x: number // Map coordinate X%
  y: number // Map coordinate Y%
  description: string
  comments: Comment[]
}

const getAqiStatus = (aqi: number) => {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Satisfactory'
  if (aqi <= 200) return 'Moderate'
  return 'Poor'
}

// Mock initial data
const INITIAL_GRIEVANCES: Grievance[] = [
  {
    id: '#COMP-1092',
    citizen: 'Aarav Mehta',
    category: 'Water Disruption',
    ward: 'Malleshwaram',
    urgency: 'Urgent',
    status: 'In Progress',
    assignedAgent: 'Ramesh K.',
    assignedDept: 'Water & Sewerage',
    date: '2026-06-15',
    x: 32,
    y: 35,
    description: 'No water supply on 8th Cross Road since yesterday morning. Pipeline pressure is zero.',
    comments: [
      { sender: 'System', text: 'Complaint registered.', time: '2026-06-15 09:00' },
      { sender: 'Admin', text: 'Dispatched Ramesh K. from Water & Sewerage team.', time: '2026-06-15 11:30' }
    ]
  },
  {
    id: '#COMP-2104',
    citizen: 'Priya Sharma',
    category: 'Waste Overflow',
    ward: 'Indiranagar',
    urgency: 'High',
    status: 'Pending',
    assignedAgent: 'Unassigned',
    assignedDept: 'Solid Waste',
    date: '2026-06-15',
    x: 72,
    y: 45,
    description: 'Commercial garbage dumped near the public park entrance. Foul smell spreading rapidly.',
    comments: [
      { sender: 'System', text: 'Complaint registered.', time: '2026-06-15 10:15' }
    ]
  },
  {
    id: '#COMP-3091',
    citizen: 'Amit Patel',
    category: 'Drainage Overflow',
    ward: 'Jayanagar',
    urgency: 'Urgent',
    status: 'Pending',
    assignedAgent: 'Unassigned',
    assignedDept: 'Water & Sewerage',
    date: '2026-06-14',
    x: 48,
    y: 78,
    description: 'Blocked drain flooding the main crossing. Commuters unable to cross without stepping in wastewater.',
    comments: [
      { sender: 'System', text: 'Complaint registered.', time: '2026-06-14 17:00' }
    ]
  },
  {
    id: '#COMP-4512',
    citizen: 'Rohan Sen',
    category: 'Broken Streetlight',
    ward: 'Rajajinagar',
    urgency: 'Medium',
    status: 'Resolved',
    assignedAgent: 'Suresh Kumar',
    assignedDept: 'Roads & Lights',
    date: '2026-06-13',
    x: 20,
    y: 55,
    description: 'Streetlight pole number R-14 has been blinking and dim for 3 consecutive days.',
    comments: [
      { sender: 'System', text: 'Complaint registered.', time: '2026-06-13 20:30' },
      { sender: 'Suresh Kumar', text: 'Replaced LED bulb and terminal connector.', time: '2026-06-14 14:00' },
      { sender: 'System', text: 'Status updated to Resolved.', time: '2026-06-14 14:00' }
    ]
  },
  {
    id: '#COMP-5201',
    citizen: 'Sneha Rao',
    category: 'Road Damage',
    ward: 'Koramangala',
    urgency: 'High',
    status: 'In Progress',
    assignedAgent: 'Manoj S.',
    assignedDept: 'Roads & Lights',
    date: '2026-06-13',
    x: 65,
    y: 72,
    description: 'Deep pothole developed near the corner of 5th Block junction. Extremely dangerous for two-wheelers.',
    comments: [
      { sender: 'System', text: 'Complaint registered.', time: '2026-06-13 11:00' },
      { sender: 'Manoj S.', text: 'Site inspected. Asphalt patch crew scheduled for local repair.', time: '2026-06-14 09:00' }
    ]
  }
]

// Open datasets data
type Dataset = {
  id: string
  name: string
  source: string
  refresh: string
  desc: string
  fields: string[]
  rows: Record<string, any>[]
}

const DATASETS: Dataset[] = [
  {
    id: 'ds-aqi',
    name: 'Bengaluru AQI Sensor Feed',
    source: 'KSPCB IoT Network',
    refresh: '15 Mins',
    desc: 'Real-time particulate matter (PM2.5, PM10) and gas readings across smart ward stations.',
    fields: ['Station ID', 'Ward', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'AQI Value', 'Status'],
    rows: [
      { id: 'AQI-01', ward: 'Malleshwaram', pm25: 42, pm10: 84, aqi: 142, status: 'Moderate' },
      { id: 'AQI-02', ward: 'Indiranagar', pm25: 18, pm10: 35, aqi: 58, status: 'Satisfactory' },
      { id: 'AQI-03', ward: 'Jayanagar', pm25: 12, pm10: 22, aqi: 45, status: 'Good' },
      { id: 'AQI-04', ward: 'Rajajinagar', pm25: 55, pm10: 110, aqi: 155, status: 'Poor' },
      { id: 'AQI-05', ward: 'Koramangala', pm25: 31, pm10: 62, aqi: 110, status: 'Moderate' }
    ]
  },
  {
    id: 'ds-accidents',
    name: 'KSP Traffic Accident Ledger',
    source: 'OpenCity / KSP Data',
    refresh: 'Daily',
    desc: 'Daily reporting of vehicular collisions, hot zones, and traffic obstructions from local control rooms.',
    fields: ['Ledger ID', 'Intersection', 'Ward', 'Incident Type', 'Severity', 'Response Time (min)'],
    rows: [
      { id: 'ACC-512', intersection: '10th Main Road', ward: 'Malleshwaram', type: 'Two-Wheeler Slip', severity: 'Minor', response: 8 },
      { id: 'ACC-513', intersection: '100 Feet Rd Junction', ward: 'Indiranagar', type: 'Rear-End collision', severity: 'Minor', response: 12 },
      { id: 'ACC-514', intersection: 'Silk Board flyover ramp', ward: 'Koramangala', type: 'Heavy Vehicle Breakdown', severity: 'Critical', response: 22 },
      { id: 'ACC-515', intersection: 'Nanda Road Circle', ward: 'Jayanagar', type: 'Pedestrian Cross Hit', severity: 'Major', response: 15 }
    ]
  },
  {
    id: 'ds-crime',
    name: 'KSP Crime Incident Logs',
    source: 'Karnataka State Police (KSP)',
    refresh: 'Weekly',
    desc: 'Anonymized official incident logs for ward intelligence matching, including vandalism and public disturbance.',
    fields: ['Record ID', 'Offense', 'Ward', 'Location Type', 'Report Date', 'Status'],
    rows: [
      { id: 'CRM-009', offense: 'Public Disturbance', ward: 'Malleshwaram', type: 'Commercial Street', date: '2026-06-12', status: 'Closed' },
      { id: 'CRM-010', offense: 'Vandalism / Defacement', ward: 'Indiranagar', type: 'Transit Hub', date: '2026-06-13', status: 'Under Review' },
      { id: 'CRM-011', offense: 'Theft / Petty Larceny', ward: 'Koramangala', type: 'Residential area', date: '2026-06-14', status: 'Active' },
      { id: 'CRM-012', offense: 'Public Intoxication', ward: 'Jayanagar', type: 'Public Park', date: '2026-06-15', status: 'Closed' }
    ]
  },
  {
    id: 'ds-boundaries',
    name: 'BBMP Ward Boundaries GIS',
    source: 'BBMP Smart City Portal',
    refresh: 'Static',
    desc: 'GIS geometry shapefiles and census aggregates defining ward authority borders and command scopes.',
    fields: ['Ward Code', 'Ward Name', 'Area (SqKm)', 'Population', 'Officers Assigned', 'Control Hub'],
    rows: [
      { code: 'W-014', name: 'Malleshwaram', area: 4.8, pop: 85000, officers: 6, hub: 'North-Command' },
      { code: 'W-022', name: 'Indiranagar', area: 5.2, pop: 98000, officers: 8, hub: 'East-Command' },
      { code: 'W-009', name: 'Jayanagar', area: 6.1, pop: 112000, officers: 9, hub: 'South-Command' },
      { code: 'W-004', name: 'Rajajinagar', area: 4.2, pop: 76000, officers: 5, hub: 'West-Command' },
      { code: 'W-012', name: 'Koramangala', area: 5.9, pop: 104000, officers: 7, hub: 'Southeast-Command' }
    ]
  }
]

export default function OfficialOperationsDashboard() {
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES)
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null)
  
  // Role switcher state
  const [roleMode, setRoleMode] = useState<'admin' | 'ward' | 'dept'>('admin')
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [wardFilter, setWardFilter] = useState('All Wards')
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [urgencyFilter, setUrgencyFilter] = useState('All Urgency')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [kpiFilter, setKpiFilter] = useState<string | null>(null) // KPI click filtering

  // Map settings
  const [mapLayers, setMapLayers] = useState<string[]>(['boundaries', 'pins'])
  const [hoveredWard, setHoveredWard] = useState<string | null>(null)

  // Dispatch / Action states
  const [assignedAgent, setAssignedAgent] = useState('Ramesh K.')
  const [actionNote, setActionNote] = useState('')
  const [newCommentText, setNewCommentText] = useState('')

  // Dataset modal
  const [activePreviewDataset, setActivePreviewDataset] = useState<Dataset | null>(null)
  const [pinnedWidgets, setPinnedWidgets] = useState<string[]>(['ds-aqi', 'ds-accidents'])

  // Smart environmental feed simulation
  const [selectedStationAqi, setSelectedStationAqi] = useState({
    ward: 'Malleshwaram',
    aqi: 142,
    pm25: 42,
    pm10: 84,
    status: 'Moderate'
  })

  // Live AQI state from MySQL
  const [aqiData, setAqiData] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/aqi')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAqiData(data)
          const blr = data.find((d: any) => d.stationId === 'AQI-BLR' || d.name === 'Bengaluru Urban') || data[0]
          if (blr) {
            setSelectedStationAqi({
              ward: blr.name,
              aqi: blr.aqi,
              pm25: blr.pm25,
              pm10: blr.pm10,
              status: getAqiStatus(blr.aqi)
            })
          }
        }
      })
      .catch(err => {
        console.error('Error fetching live AQI:', err)
      })
  }, [])

  // Role Scope Effect Toggles
  const handleRoleModeChange = (mode: 'admin' | 'ward' | 'dept') => {
    setRoleMode(mode)
    setKpiFilter(null)
    if (mode === 'ward') {
      setWardFilter('Malleshwaram')
      setDeptFilter('All Departments')
    } else if (mode === 'dept') {
      setWardFilter('All Wards')
      setDeptFilter('Solid Waste')
    } else {
      setWardFilter('All Wards')
      setDeptFilter('All Departments')
    }
  }

  // Wards coordinates and details for interactive SVG map
  const WARD_POLYGONS = [
    { name: 'Malleshwaram', points: '10,10 50,10 40,45 10,40', color: 'rgba(109, 153, 152, 0.15)', stroke: '#6D9998' },
    { name: 'Rajajinagar', points: '10,40 40,45 35,65 10,65', color: 'rgba(230, 0, 35, 0.05)', stroke: '#e60023' },
    { name: 'Jayanagar', points: '35,65 55,60 50,95 30,90', color: 'rgba(123, 143, 101, 0.15)', stroke: '#7B8F65' },
    { name: 'Koramangala', points: '55,60 90,65 85,90 50,95', color: 'rgba(226, 185, 59, 0.15)', stroke: '#E2B93B' },
    { name: 'Indiranagar', points: '50,10 90,15 90,65 55,60 40,45', color: 'rgba(54, 55, 93, 0.15)', stroke: '#36375D' }
  ]

  // Count helper functions
  const kpis = useMemo(() => {
    // Basic counts filtered by current role scope
    let scoped = grievances
    if (roleMode === 'ward') {
      scoped = grievances.filter(g => g.ward === 'Malleshwaram')
    } else if (roleMode === 'dept') {
      scoped = grievances.filter(g => g.assignedDept === 'Solid Waste')
    }

    const total = scoped.length
    const open = scoped.filter(g => g.status !== 'Resolved').length
    
    // SLA Breach count (defined as status !== Resolved and urgency is Urgent or High, or older than 1 day)
    const breached = scoped.filter(g => g.status !== 'Resolved' && (g.urgency === 'Urgent' || g.id === '#COMP-2104')).length
    const atRisk = scoped.filter(g => g.status !== 'Resolved' && g.urgency === 'High' && g.id !== '#COMP-2104').length
    const resolved = scoped.filter(g => g.status === 'Resolved').length

    return { total, open, breached, atRisk, resolved }
  }, [grievances, roleMode])

  // Filter grievance queue
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      // Role scoping
      if (roleMode === 'ward' && g.ward !== 'Malleshwaram') return false
      if (roleMode === 'dept' && g.assignedDept !== 'Solid Waste') return false

      // General dropdown/search filters
      const matchesSearch = 
        g.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.citizen.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesWard = wardFilter === 'All Wards' || g.ward === wardFilter
      const matchesDept = deptFilter === 'All Departments' || g.assignedDept === deptFilter
      const matchesUrgency = urgencyFilter === 'All Urgency' || g.urgency === urgencyFilter
      const matchesStatus = statusFilter === 'All Status' || g.status === statusFilter

      // KPI filter constraints
      let matchesKpi = true
      if (kpiFilter === 'open') {
        matchesKpi = g.status !== 'Resolved'
      } else if (kpiFilter === 'breached') {
        matchesKpi = g.status !== 'Resolved' && (g.urgency === 'Urgent' || g.id === '#COMP-2104')
      } else if (kpiFilter === 'resolved') {
        matchesKpi = g.status === 'Resolved'
      }

      return matchesSearch && matchesWard && matchesDept && matchesUrgency && matchesStatus && matchesKpi
    })
  }, [grievances, roleMode, searchTerm, wardFilter, deptFilter, urgencyFilter, statusFilter, kpiFilter])

  // Dispatch Actions
  const handleAssignAgent = () => {
    if (!selectedGrievance) return
    const updated = grievances.map((g) => {
      if (g.id === selectedGrievance.id) {
        const comment: Comment = {
          sender: 'Dispatcher (Official)',
          text: `Assigned agent ${assignedAgent}. Note: ${actionNote || 'No notes added.'}`,
          time: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        return {
          ...g,
          assignedAgent,
          status: 'In Progress' as const,
          comments: [...g.comments, comment]
        }
      }
      return g
    })
    setGrievances(updated)
    const refreshed = updated.find(g => g.id === selectedGrievance.id)
    if (refreshed) setSelectedGrievance(refreshed)
    setActionNote('')
  }

  const handleResolveGrievance = () => {
    if (!selectedGrievance) return
    const updated = grievances.map((g) => {
      if (g.id === selectedGrievance.id) {
        const comment: Comment = {
          sender: 'System / Inspector',
          text: `Grievance verified and resolved. Action details: ${actionNote || 'Resolved via standard operations.'}`,
          time: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        return {
          ...g,
          status: 'Resolved' as const,
          comments: [...g.comments, comment]
        }
      }
      return g
    })
    setGrievances(updated)
    const refreshed = updated.find(g => g.id === selectedGrievance.id)
    if (refreshed) setSelectedGrievance(refreshed)
    setActionNote('')
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGrievance || !newCommentText.trim()) return
    const updated = grievances.map((g) => {
      if (g.id === selectedGrievance.id) {
        const comment: Comment = {
          sender: 'Official Internal',
          text: newCommentText,
          time: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        return {
          ...g,
          comments: [...g.comments, comment]
        }
      }
      return g
    })
    setGrievances(updated)
    const refreshed = updated.find(g => g.id === selectedGrievance.id)
    if (refreshed) setSelectedGrievance(refreshed)
    setNewCommentText('')
  }

  // Handle station click to simulate interactive AQI reading changes
  const handleStationClick = (station: string, aqiVal: number, pm25Val: number, pm10Val: number, statusVal: string) => {
    setSelectedStationAqi({
      ward: station,
      aqi: aqiVal,
      pm25: pm25Val,
      pm10: pm10Val,
      status: statusVal
    })
  }

  const toggleLayer = (layer: string) => {
    if (mapLayers.includes(layer)) {
      setMapLayers(mapLayers.filter(l => l !== layer))
    } else {
      setMapLayers([...mapLayers, layer])
    }
  }

  const togglePinWidget = (id: string) => {
    if (pinnedWidgets.includes(id)) {
      setPinnedWidgets(pinnedWidgets.filter(w => w !== id))
    } else {
      setPinnedWidgets([...pinnedWidgets, id])
    }
  }

  // Export report alert mock
  const handleExportReport = (reportType: string) => {
    alert(`Report of type "${reportType}" successfully compiled and exported. Download queued in Background.`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6f6f3',
      color: '#000000',
      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '60px'
    }}>
      {/* Persistent Dashboard Banner */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #dadad3',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: '60px',
        zIndex: 900
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#e60023',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>ICCC Command</span>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Nagaragupta Civic Operations Control
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#555550' }}>
            Smart City SLA Monitoring Portal & Joint Agency Coordination Screen
          </p>
        </div>

        {/* Role View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f6f6f3', padding: '4px', borderRadius: '12px', border: '1px solid #dadad3' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#555550', padding: '0 8px', textTransform: 'uppercase' }}>Scope View:</span>
          {(['admin', 'ward', 'dept'] as const).map((mode) => {
            const isAct = roleMode === mode
            return (
              <button
                key={mode}
                onClick={() => handleRoleModeChange(mode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAct ? '#e60023' : 'transparent',
                  color: isAct ? '#ffffff' : '#000000',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 150ms ease'
                }}
              >
                {mode === 'ward' ? 'Ward Officer (Ward 14)' : mode === 'dept' ? 'Solid Waste User' : 'Admin (City Wide)'}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* BAND A - High-Level KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* KPI 1 */}
          <div 
            onClick={() => setKpiFilter(kpiFilter === 'open' ? null : 'open')}
            style={{
              background: '#ffffff',
              border: kpiFilter === 'open' ? '2px solid #e60023' : '1px solid #dadad3',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              position: 'relative',
              transition: 'transform 150ms ease'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555550', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>Open Complaints</span>
              <AlertCircle size={14} color="#e60023" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Bricolage Grotesque' }}>
              {kpis.open} <span style={{ fontSize: '14px', color: '#555550', fontWeight: 500 }}>/ {kpis.total} total</span>
            </div>
            <div style={{ fontSize: '11px', color: '#e60023', fontWeight: 700 }}>
              ⚠️ Needs Action immediately
            </div>
          </div>

          {/* KPI 2 */}
          <div 
            onClick={() => setKpiFilter(kpiFilter === 'breached' ? null : 'breached')}
            style={{
              background: '#ffffff',
              border: kpiFilter === 'breached' ? '2px solid #e60023' : '1px solid #dadad3',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              transition: 'transform 150ms ease'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555550', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>SLA Breach Risk</span>
              <ShieldAlert size={14} color="#e60023" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Bricolage Grotesque', color: '#e60023' }}>
              {kpis.breached} <span style={{ fontSize: '12px', color: '#555550', fontWeight: 500 }}>breached</span>
            </div>
            <div style={{ fontSize: '11px', color: '#E2B93B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E2B93B', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              {kpis.atRisk} approaching threshold (24h)
            </div>
          </div>

          {/* KPI 3 */}
          <div 
            onClick={() => setKpiFilter(kpiFilter === 'resolved' ? null : 'resolved')}
            style={{
              background: '#ffffff',
              border: kpiFilter === 'resolved' ? '2px solid #7B8F65' : '1px solid #dadad3',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              transition: 'transform 150ms ease'
            }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555550', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>Resolved Last 24h</span>
              <CheckCircle2 size={14} color="#7B8F65" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Bricolage Grotesque', color: '#7B8F65' }}>
              {kpis.resolved} <span style={{ fontSize: '14px', color: '#555550', fontWeight: 500 }}>done</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7B8F65', fontWeight: 700 }}>
              📈 +14% performance index
            </div>
          </div>

          {/* KPI 4 */}
          <div 
            style={{
              background: '#ffffff',
              border: '1px solid #dadad3',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              transition: 'transform 150ms ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555550', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>Live environment feed</span>
              <Wind size={14} color="#6D9998" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Bricolage Grotesque', color: selectedStationAqi.aqi > 100 ? '#e60023' : '#7B8F65' }}>
              {selectedStationAqi.aqi} AQI
            </div>
            <div style={{ fontSize: '11px', color: '#555550' }}>
              Station: <strong style={{ color: '#000' }}>{selectedStationAqi.ward}</strong> ({selectedStationAqi.status})
            </div>
          </div>

          {/* KPI 5 */}
          <div 
            style={{
              background: '#ffffff',
              border: '1px solid #dadad3',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              transition: 'transform 150ms ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555550', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>Rain / Flood Watch</span>
              <Thermometer size={14} color="#E2B93B" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Bricolage Grotesque' }}>
              24.2 °C
            </div>
            <div style={{ fontSize: '11px', color: '#e60023', fontWeight: 700 }}>
              🌧️ Orange Alert: heavy rain forecast
            </div>
          </div>
        </div>

        {/* BAND B - Map + Complaint Queue */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '24px',
          alignItems: 'stretch'
        }} className="band-b-grid">
          
          {/* Left Block - Interactive Map & Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Map Component */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, fontFamily: 'Bricolage Grotesque' }}>
                    Interactive City Ward Map
                  </h3>
                  <span style={{ fontSize: '11px', color: '#555550' }}>Select Wards or pins to scope grievances</span>
                </div>

                {/* Map Layers Toolbox */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => toggleLayer('boundaries')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #dadad3',
                      background: mapLayers.includes('boundaries') ? '#36375D' : '#ffffff',
                      color: mapLayers.includes('boundaries') ? '#ffffff' : '#555550',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Layers size={10} /> Boundaries
                  </button>
                  <button
                    onClick={() => toggleLayer('heatmap')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #dadad3',
                      background: mapLayers.includes('heatmap') ? '#e60023' : '#ffffff',
                      color: mapLayers.includes('heatmap') ? '#ffffff' : '#555550',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Compass size={10} /> Heatmap
                  </button>
                  <button
                    onClick={() => toggleLayer('aqi')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #dadad3',
                      background: mapLayers.includes('aqi') ? '#7B8F65' : '#ffffff',
                      color: mapLayers.includes('aqi') ? '#ffffff' : '#555550',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Wind size={10} /> AQI Feeds
                  </button>
                </div>
              </div>

              {/* Map SVG container */}
              <div style={{
                position: 'relative',
                height: '350px',
                background: '#ECEDF2',
                borderRadius: '12px',
                border: '1px solid #dadad3',
                overflow: 'hidden'
              }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  {/* Map Wards polygons */}
                  {WARD_POLYGONS.map((polygon) => {
                    const isSelected = wardFilter === polygon.name
                    const isHoveredLocal = hoveredWard === polygon.name
                    return (
                      <polygon
                        key={polygon.name}
                        points={polygon.points}
                        fill={isSelected ? 'rgba(230, 0, 35, 0.25)' : isHoveredLocal ? 'rgba(54, 55, 93, 0.25)' : polygon.color}
                        stroke={polygon.stroke}
                        strokeWidth={isSelected || isHoveredLocal ? 1.5 : 0.5}
                        style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
                        onMouseEnter={() => setHoveredWard(polygon.name)}
                        onMouseLeave={() => setHoveredWard(null)}
                        onClick={() => {
                          setWardFilter(wardFilter === polygon.name ? 'All Wards' : polygon.name)
                          setKpiFilter(null)
                        }}
                      />
                    )
                  })}

                  {/* Boundaries outline */}
                  {mapLayers.includes('boundaries') && (
                    <path d="M50,10 L40,45 L10,40 M40,45 L55,60 L90,65 M55,60 L50,95 M10,40 M35,65 L55,60" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1.5" />
                  )}

                  {/* Simulated Heatmap overlays */}
                  {mapLayers.includes('heatmap') && (
                    <>
                      <circle cx="32" cy="35" r="8" fill="rgba(230, 0, 35, 0.3)" filter="blur(8px)" style={{ filter: 'blur(5px)' }} />
                      <circle cx="48" cy="78" r="10" fill="rgba(230, 0, 35, 0.4)" filter="blur(10px)" style={{ filter: 'blur(6px)' }} />
                      <circle cx="72" cy="45" r="7" fill="rgba(230, 0, 35, 0.25)" filter="blur(7px)" style={{ filter: 'blur(4px)' }} />
                    </>
                  )}

                  {/* Environmental Sensors Layer */}
                  {mapLayers.includes('aqi') && (
                    <>
                      {aqiData.length > 0 ? (
                        aqiData.map((item) => {
                          const pos = ({
                            'AQI-BLR': { cx: 35, cy: 20 },
                            'AQI-MYS': { cx: 45, cy: 85 },
                            'AQI-MLR': { cx: 80, cy: 30 },
                            'AQI-BEL': { cx: 20, cy: 50 },
                            'AQI-KLB': { cx: 60, cy: 15 },
                            'AQI-BGK': { cx: 25, cy: 30 },
                            'AQI-RAM': { cx: 40, cy: 35 },
                            'AQI-BLY': { cx: 55, cy: 40 },
                            'AQI-BDR': { cx: 70, cy: 45 },
                            'AQI-VJP': { cx: 85, cy: 50 },
                            'AQI-CHM': { cx: 15, cy: 60 },
                            'AQI-CKM': { cx: 30, cy: 65 },
                            'AQI-CTA': { cx: 50, cy: 70 },
                            'AQI-DVG': { cx: 65, cy: 75 },
                            'AQI-DWD': { cx: 75, cy: 80 },
                            'AQI-GDG': { cx: 90, cy: 85 },
                            'AQI-HSN': { cx: 10, cy: 15 },
                            'AQI-HVR': { cx: 22, cy: 25 },
                            'AQI-KDG': { cx: 48, cy: 55 },
                            'AQI-CBP': { cx: 58, cy: 60 },
                            'AQI-KPL': { cx: 68, cy: 65 },
                            'AQI-MDY': { cx: 78, cy: 70 },
                            'AQI-RCR': { cx: 88, cy: 75 },
                            'AQI-SMG': { cx: 12, cy: 80 },
                            'AQI-TMK': { cx: 33, cy: 90 },
                            'AQI-UDP': { cx: 53, cy: 10 },
                            'AQI-UKN': { cx: 63, cy: 22 },
                            'AQI-BLR-R': { cx: 73, cy: 35 },
                            'AQI-KLR': { cx: 83, cy: 40 },
                            'AQI-YDG': { cx: 93, cy: 45 }
                          } as Record<string, { cx: number, cy: number }>)[item.stationId as string] || { cx: 50, cy: 50 }

                          const status = getAqiStatus(item.aqi)
                          const color = item.aqi > 100 ? '#e60023' : '#7B8F65'
                          return (
                            <g 
                              key={item.stationId} 
                              onClick={() => handleStationClick(item.name, item.aqi, item.pm25, item.pm10, status)} 
                              style={{ cursor: 'pointer' }}
                            >
                              <circle cx={pos.cx} cy={pos.cy} r="2.5" fill={color} stroke="#fff" strokeWidth="0.5" />
                              <text x={pos.cx + 4} y={pos.cy + 1} fontSize="3" fontWeight="bold" fill="#000">
                                {item.name} ({item.aqi})
                              </text>
                            </g>
                          )
                        })
                      ) : (
                        <>
                          {/* AQI Malleshwaram */}
                          <g onClick={() => handleStationClick('Malleshwaram', 142, 42, 84, 'Moderate')} style={{ cursor: 'pointer' }}>
                            <circle cx="35" cy="20" r="2.5" fill="#e60023" stroke="#fff" strokeWidth="0.5" />
                            <text x="39" y="21" fontSize="3" fontWeight="bold" fill="#000">AQI-01 (142)</text>
                          </g>
                          {/* AQI Jayanagar */}
                          <g onClick={() => handleStationClick('Jayanagar', 45, 12, 22, 'Good')} style={{ cursor: 'pointer' }}>
                            <circle cx="45" cy="85" r="2.5" fill="#7B8F65" stroke="#fff" strokeWidth="0.5" />
                            <text x="49" y="86" fontSize="3" fontWeight="bold" fill="#000">AQI-03 (45)</text>
                          </g>
                          {/* AQI Indiranagar */}
                          <g onClick={() => handleStationClick('Indiranagar', 58, 18, 35, 'Satisfactory')} style={{ cursor: 'pointer' }}>
                            <circle cx="80" cy="30" r="2.5" fill="#E2B93B" stroke="#fff" strokeWidth="0.5" />
                            <text x="74" y="27" fontSize="3" fontWeight="bold" fill="#000">AQI-02 (58)</text>
                          </g>
                        </>
                      )}
                    </>
                  )}

                  {/* Complaint Pins */}
                  {mapLayers.includes('pins') && filteredGrievances.map((g) => {
                    const isSelected = selectedGrievance?.id === g.id
                    return (
                      <g 
                        key={g.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedGrievance(g)}
                      >
                        <circle 
                          cx={g.x} 
                          cy={g.y} 
                          r={isSelected ? 3.5 : 2} 
                          fill={g.status === 'Resolved' ? '#7B8F65' : g.urgency === 'Urgent' ? '#e60023' : '#E2B93B'} 
                          stroke="#ffffff" 
                          strokeWidth={isSelected ? 1 : 0.5} 
                        />
                        {isSelected && (
                          <circle 
                            cx={g.x} 
                            cy={g.y} 
                            r="6" 
                            fill="none" 
                            stroke={g.urgency === 'Urgent' ? '#e60023' : '#E2B93B'} 
                            strokeWidth="0.5" 
                            style={{ animation: 'pulse 1.5s infinite' }}
                          />
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* Map Legend Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(4px)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #dadad3',
                  fontSize: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>Grievance Pins</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e60023' }} /> Urgent/Critical SLA
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E2B93B' }} /> Active standard
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7B8F65' }} /> Resolved Issues
                  </div>
                </div>

                {/* Current Scope Banner inside Map */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: '#36375D',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  🌍 Ward: {wardFilter} | Dept: {deptFilter}
                </div>
              </div>
            </div>

            {/* Complaint Queue Table */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
            }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, fontFamily: 'Bricolage Grotesque' }}>
                    Priority Grievance Desk ({filteredGrievances.length})
                  </h3>
                  
                  {/* Reset Filters button */}
                  {(searchTerm || wardFilter !== 'All Wards' || deptFilter !== 'All Departments' || urgencyFilter !== 'All Urgency' || statusFilter !== 'All Status' || kpiFilter) && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setWardFilter(roleMode === 'ward' ? 'Malleshwaram' : 'All Wards')
                        setDeptFilter(roleMode === 'dept' ? 'Solid Waste' : 'All Departments')
                        setUrgencyFilter('All Urgency')
                        setStatusFilter('All Status')
                        setKpiFilter(null)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e60023',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
                    <input
                      type="text"
                      placeholder="Search ID, keyword..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '12px',
                        borderRadius: '8px',
                        border: '1px solid #dadad3',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Ward Dropdown */}
                  <select
                    value={wardFilter}
                    disabled={roleMode === 'ward'}
                    onChange={(e) => { setWardFilter(e.target.value); setKpiFilter(null); }}
                    style={{ height: '34px', borderRadius: '8px', border: '1px solid #dadad3', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="All Wards">All Wards</option>
                    <option value="Malleshwaram">Malleshwaram</option>
                    <option value="Indiranagar">Indiranagar</option>
                    <option value="Jayanagar">Jayanagar</option>
                    <option value="Rajajinagar">Rajajinagar</option>
                    <option value="Koramangala">Koramangala</option>
                  </select>

                  {/* Dept Dropdown */}
                  <select
                    value={deptFilter}
                    disabled={roleMode === 'dept'}
                    onChange={(e) => { setDeptFilter(e.target.value); setKpiFilter(null); }}
                    style={{ height: '34px', borderRadius: '8px', border: '1px solid #dadad3', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="All Departments">All Depts</option>
                    <option value="Water & Sewerage">Water & Sewerage</option>
                    <option value="Solid Waste">Solid Waste</option>
                    <option value="Roads & Lights">Roads & Lights</option>
                  </select>

                  {/* Urgency */}
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    style={{ height: '34px', borderRadius: '8px', border: '1px solid #dadad3', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="All Urgency">All Urgency</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  {/* Status */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ height: '34px', borderRadius: '8px', border: '1px solid #dadad3', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="All Status">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #dadad3', color: '#555550', fontWeight: 700 }}>
                      <th style={{ padding: '8px' }}>ID</th>
                      <th style={{ padding: '8px' }}>Category</th>
                      <th style={{ padding: '8px' }}>Ward</th>
                      <th style={{ padding: '8px' }}>Urgency</th>
                      <th style={{ padding: '8px' }}>SLA Status</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGrievances.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px 8px', textAlign: 'center', color: '#888' }}>
                          No matching grievances under current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredGrievances.map((g) => {
                        const isSelected = selectedGrievance?.id === g.id
                        // Calculate mock SLA status representation
                        const isSlaBreached = g.status !== 'Resolved' && (g.urgency === 'Urgent' || g.id === '#COMP-2104')
                        const isSlaAtRisk = g.status !== 'Resolved' && g.urgency === 'High' && g.id !== '#COMP-2104'
                        
                        return (
                          <tr
                            key={g.id}
                            onClick={() => setSelectedGrievance(g)}
                            style={{
                              borderBottom: '1px solid #f6f6f3',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(230, 0, 35, 0.04)' : 'transparent',
                              fontWeight: isSelected ? 600 : 400
                            }}
                            className="table-row-hover"
                          >
                            <td style={{ padding: '10px 8px', fontWeight: 700, color: '#e60023' }}>{g.id}</td>
                            <td style={{ padding: '10px 8px' }}>{g.category}</td>
                            <td style={{ padding: '10px 8px' }}>{g.ward}</td>
                            <td style={{ padding: '10px 8px' }}>
                              <span style={{
                                color: g.urgency === 'Urgent' ? '#e60023' : g.urgency === 'High' ? '#E2B93B' : '#555',
                                fontWeight: g.urgency === 'Urgent' || g.urgency === 'High' ? 700 : 500
                              }}>{g.urgency}</span>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isSlaBreached ? 'rgba(230,0,35,0.08)' : isSlaAtRisk ? 'rgba(226,185,59,0.08)' : 'rgba(123,143,101,0.08)',
                                color: isSlaBreached ? '#e60023' : isSlaAtRisk ? '#E2B93B' : '#7B8F65',
                                fontWeight: 700
                              }}>
                                {isSlaBreached ? 'Breached' : isSlaAtRisk ? 'At Risk' : 'On Track'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <span style={{
                                color: g.status === 'Resolved' ? '#7B8F65' : g.status === 'In Progress' ? '#6D9998' : '#e60023',
                                fontWeight: 700
                              }}>{g.status}</span>
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

          {/* Right Block - Dispatch Detail Workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Active Details */}
            {selectedGrievance ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '2px solid #e60023',
                padding: '20px',
                boxShadow: '0 4px 16px rgba(230, 0, 35, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e60023', fontFamily: 'monospace' }}>
                      {selectedGrievance.id}
                    </span>
                    <span style={{ fontSize: '10px', color: '#555550' }}>{selectedGrievance.date}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedGrievance(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#555550', textTransform: 'uppercase' }}>
                    {selectedGrievance.category}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0', fontFamily: 'Bricolage Grotesque' }}>
                    {selectedGrievance.ward} Ward
                  </h4>
                  <p style={{ fontSize: '12px', color: '#262622', margin: '8px 0 0 0', lineHeight: 1.4, background: '#f6f6f3', padding: '10px', borderRadius: '8px' }}>
                    "{selectedGrievance.description}"
                  </p>
                </div>

                <div style={{ fontSize: '12px', borderTop: '1px solid #f6f6f3', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>Citizen Resident: <strong>{selectedGrievance.citizen}</strong></div>
                  <div>Assigned Department: <strong style={{ color: '#36375D' }}>{selectedGrievance.assignedDept}</strong></div>
                  <div>Assigned Agent: <strong>{selectedGrievance.assignedAgent}</strong></div>
                  <div>Urgency Priority: <strong style={{ color: selectedGrievance.urgency === 'Urgent' ? '#e60023' : '#000' }}>{selectedGrievance.urgency}</strong></div>
                </div>

                {/* Dispatch Controls */}
                {selectedGrievance.status !== 'Resolved' ? (
                  <div style={{ borderTop: '1px solid #f6f6f3', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#555550', textTransform: 'uppercase' }}>
                      Integrated Dispatch Actions
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#000', marginBottom: '4px' }}>
                        Dispatch Field Team Agent
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={assignedAgent}
                          onChange={(e) => setAssignedAgent(e.target.value)}
                          style={{ flex: 1, height: '34px', borderRadius: '6px', border: '1px solid #dadad3', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="Ramesh K.">Ramesh K. (SWM Team Lead)</option>
                          <option value="Suresh Kumar">Suresh Kumar (Electrician II)</option>
                          <option value="Manoj S.">Manoj S. (BBMP Field Inspector)</option>
                          <option value="Deepak M.">Deepak M. (Water Hydrology Specialist)</option>
                        </select>
                        <button
                          onClick={handleAssignAgent}
                          style={{
                            padding: '0 12px',
                            background: '#36375D',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#000', marginBottom: '4px' }}>
                        Operation Notes (Mandatory for closure)
                      </label>
                      <textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Verify site action, materials used, contractor feedback..."
                        style={{
                          width: '100%',
                          height: '50px',
                          borderRadius: '6px',
                          border: '1px solid #dadad3',
                          padding: '6px 8px',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>

                    <button
                      onClick={handleResolveGrievance}
                      style={{
                        width: '100%',
                        height: '36px',
                        background: '#7B8F65',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={14} /> Close & Mark Resolved
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(123,143,101,0.08)', border: '1px solid #7B8F65', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ color: '#7B8F65', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Check size={14} /> Grievance Resolved
                    </div>
                    <span style={{ fontSize: '10px', color: '#555' }}>SLA verified & logged. Closed securely.</span>
                  </div>
                )}

                {/* Internal comments timeline */}
                <div style={{ borderTop: '1px solid #f6f6f3', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#555550', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Official Internal Log Timeline
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto', marginBottom: '10px' }}>
                    {selectedGrievance.comments.map((c, i) => (
                      <div key={i} style={{ background: '#f6f6f3', padding: '6px 8px', borderRadius: '6px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#36375D', marginBottom: '2px' }}>
                          <span>{c.sender}</span>
                          <span style={{ color: '#777', fontWeight: 400 }}>{c.time}</span>
                        </div>
                        <span style={{ color: '#262622' }}>{c.text}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add system update or comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      style={{
                        flex: 1,
                        height: '28px',
                        border: '1px solid #dadad3',
                        borderRadius: '4px',
                        padding: '0 8px',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        width: '28px',
                        height: '28px',
                        background: '#36375D',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Send size={11} />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #dadad3',
                padding: '30px 20px',
                textAlign: 'center',
                color: '#555550',
                boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <MapPin size={32} color="#e60023" style={{ animation: 'bounce 2s infinite' }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '13px', color: '#000' }}>
                    Integrated Dispatch Workspace
                  </h4>
                  <span style={{ fontSize: '11px', lineHeight: 1.4 }}>
                    Select any complaint row in the Priority Queue or tap a pin on the Interactive Map to assign field teams, add action notes, and verify SLA resolution.
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 12px 0', fontFamily: 'Bricolage Grotesque' }}>
                Operational Report Generator
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => handleExportReport('24 Hour SLA Status')}
                  style={{
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #dadad3',
                    background: '#f6f6f3',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <FileSpreadsheet size={12} /> 24h SLA Report
                </button>
                <button
                  onClick={() => handleExportReport('Ward Complaint Hotspots')}
                  style={{
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #dadad3',
                    background: '#f6f6f3',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Map size={12} /> Ward Hotspots
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BAND C - Analytics, Trends & Dataset Explorer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '24px'
        }} className="band-c-grid">
          
          {/* Bottom Left - Analytics & Environmental feeds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Visual Analytics */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 16px 0', fontFamily: 'Bricolage Grotesque' }}>
                Operational Trends & Analytics
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }} className="analytics-split">
                {/* Horizontal Category Bars */}
                <div>
                  <h4 style={{ fontSize: '11px', color: '#555550', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                    Complaint Category Load
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Water & Sewerage</span>
                        <strong>40%</strong>
                      </div>
                      <div style={{ height: '6px', background: '#f6f6f3', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#36375D', width: '40%' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Roads & Lights</span>
                        <strong>40%</strong>
                      </div>
                      <div style={{ height: '6px', background: '#f6f6f3', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#e60023', width: '40%' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Solid Waste</span>
                        <strong>20%</strong>
                      </div>
                      <div style={{ height: '6px', background: '#f6f6f3', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#E2B93B', width: '20%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SVG Area Chart of SLA Speed */}
                <div>
                  <h4 style={{ fontSize: '11px', color: '#555550', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>SLA Compliance History</span>
                    <span style={{ color: '#7B8F65' }}>94% Target</span>
                  </h4>
                  
                  <div style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                    <svg viewBox="0 0 500 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6D9998" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#6D9998" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Area */}
                      <path 
                        d="M 0 100 L 0 50 L 80 65 L 160 55 L 240 30 L 320 15 L 400 60 L 500 20 L 500 100 Z" 
                        fill="url(#grad-area)" 
                      />
                      
                      {/* Line */}
                      <path 
                        d="M 0 50 L 80 65 L 160 55 L 240 30 L 320 15 L 400 60 L 500 20" 
                        fill="none" 
                        stroke="#6D9998" 
                        strokeWidth="2.5" 
                      />
                      
                      {/* Nodes */}
                      <circle cx="0" cy="50" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="80" cy="65" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="160" cy="55" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="240" cy="30" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="320" cy="15" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="400" cy="60" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                      <circle cx="500" cy="20" r="3.5" fill="#6D9998" stroke="#fff" strokeWidth="1" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#888', marginTop: '6px' }}>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun (Today)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental AQI trends feed */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, fontFamily: 'Bricolage Grotesque' }}>
                  AQI Sensor Hourly Grid
                </h3>
                <span style={{ fontSize: '11px', color: '#7B8F65', fontWeight: 700 }}>Updated 2 mins ago</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {(aqiData.length > 0
                  ? aqiData.map(d => ({ id: d.stationId, ward: d.name, aqi: d.aqi, status: getAqiStatus(d.aqi) }))
                  : DATASETS[0].rows
                ).map((row) => (
                  <div 
                    key={row.id} 
                    style={{
                      background: '#f6f6f3',
                      border: '1px solid #dadad3',
                      borderRadius: '12px',
                      padding: '12px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#555550' }}>{row.ward}</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0', color: row.aqi > 120 ? '#e60023' : '#7B8F65' }}>
                      {row.aqi} AQI
                    </div>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#777' }}>
                      {row.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Right - Dataset Explorer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Open Datasets Explorer */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, fontFamily: 'Bricolage Grotesque' }}>
                    Open Datasets Explorer
                  </h3>
                  <span style={{ fontSize: '11px', color: '#555550' }}>GIS, police accident data, and telemetry</span>
                </div>
                <Compass size={18} color="#e60023" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DATASETS.map((ds) => {
                  const isPinned = pinnedWidgets.includes(ds.id)
                  return (
                    <div
                      key={ds.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #dadad3',
                        borderRadius: '12px',
                        background: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '12px', color: '#000' }}>{ds.name}</strong>
                          <div style={{ fontSize: '10px', color: '#555550', marginTop: '2px' }}>
                            Source: {ds.source} | Refreshes: {ds.refresh}
                          </div>
                        </div>

                        {/* Interactive Widget Actions */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setActivePreviewDataset(ds)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #dadad3',
                              background: '#f6f6f3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Preview Rows"
                          >
                            <Eye size={12} color="#000" />
                          </button>
                          
                          <button
                            onClick={() => togglePinWidget(ds.id)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #dadad3',
                              background: isPinned ? 'rgba(230,0,35,0.08)' : '#f6f6f3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title={isPinned ? 'Unpin widget' : 'Pin widget to control deck'}
                          >
                            <Plus size={12} color={isPinned ? '#e60023' : '#000'} />
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '11px', color: '#555', margin: '6px 0 0 0', lineHeight: 1.3 }}>
                        {ds.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pinned Widgets Summary Panel */}
            {pinnedWidgets.length > 0 && (
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #dadad3',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 12px 0', fontFamily: 'Bricolage Grotesque', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={14} color="#e60023" /> Pinned Dataset Summaries
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pinnedWidgets.includes('ds-aqi') && (
                    <div style={{ fontSize: '11px', background: '#f6f6f3', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#36375D', display: 'flex', justifyContent: 'space-between' }}>
                        <span>AQI sensor stats</span>
                        <span>Satisfactory Avg</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>Avg reading is 84 AQI. Lowest in Jayanagar (45). Highest in Rajajinagar (155).</div>
                    </div>
                  )}

                  {pinnedWidgets.includes('ds-accidents') && (
                    <div style={{ fontSize: '11px', background: '#f6f6f3', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#36375D', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Traffic Incident feeds</span>
                        <span>4 Logged Today</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>SLA response time avg is 14.2 mins. Silk Board breakdown remains critical.</div>
                    </div>
                  )}

                  {pinnedWidgets.includes('ds-crime') && (
                    <div style={{ fontSize: '11px', background: '#f6f6f3', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#36375D', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Public crime intelligence</span>
                        <span>1 active audit</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>1 active investigation in Indiranagar. Public Disturbance logs are closed.</div>
                    </div>
                  )}

                  {pinnedWidgets.includes('ds-boundaries') && (
                    <div style={{ fontSize: '11px', background: '#f6f6f3', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#36375D', display: 'flex', justifyContent: 'space-between' }}>
                        <span>BBMP GIS boundaries</span>
                        <span>5 areas mapped</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>Total mapped population is 475,000 residents across active control deck.</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Dataset Preview Modal Overlay */}
      {activePreviewDataset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #dadad3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f6f6f3'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Dataset Raw Row Preview: {activePreviewDataset.name}
                </h3>
                <span style={{ fontSize: '11px', color: '#555550' }}>Source: {activePreviewDataset.source}</span>
              </div>
              <button
                onClick={() => setActivePreviewDataset(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#000',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dadad3', color: '#000', fontWeight: 700 }}>
                      {activePreviewDataset.fields.map((field) => (
                        <th key={field} style={{ padding: '8px' }}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePreviewDataset.rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f6f6f3' }}>
                        {Object.values(row).map((val, colIdx) => (
                          <td key={colIdx} style={{ padding: '8px', color: '#262622' }}>{val.toString()}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #dadad3',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f6f6f3'
            }}>
              <button
                onClick={() => setActivePreviewDataset(null)}
                style={{
                  height: '32px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: '1px solid #dadad3',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Animations */}
      <style>{`
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(4, 4, 6, 0.04) !important;
        }
        .table-row-hover:hover {
          background-color: rgba(230, 0, 35, 0.02) !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 900px) {
          .band-b-grid, .band-c-grid {
            grid-template-columns: 1fr !important;
          }
          .analytics-split {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
