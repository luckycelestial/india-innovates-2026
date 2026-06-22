'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  ShieldAlert, MapPin, Clock, Search, RefreshCw, Plus, Edit2, Trash2, 
  Eye, X, ArrowUpDown, ChevronDown, Award, Shield, FileText, CheckCircle2, User
} from 'lucide-react'
import { createClient } from '@/lib/db/client'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const CRIME_CATEGORIES = ['cybercrime', 'narcotics', 'theft', 'assault', 'robbery', 'murder']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 
  'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 
  'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 
  'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
]

type SocioEconomicFactors = {
  unemployment_rate?: number
  poverty_index?: number
  education_index?: number
}

type Incident = {
  id: string
  case_number: string
  category: string
  description: string | null
  location: string
  district: string
  police_station: string
  latitude: number
  longitude: number
  date_time: string
  priority: string
  modus_operandi: string | null
  socio_economic_factors: SocioEconomicFactors | string | null
  risk_score: number
}

type Person = {
  id: string
  name: string
  classification: string
  demographics: any
}

type Connection = {
  id: string
  incident_id: string
  person_id: string
  role: string
}

export default function CrimesCRUDPage() {
  const db = createClient()

  // State
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Modals / Panels
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  // Selected Objects
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [editingIncident, setEditingIncident] = useState<Partial<Incident>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load Database
  const loadData = async () => {
    setLoading(true)
    try {
      const [incidentsRes, peopleRes, connectionsRes] = await Promise.all([
        db.from('ksp_incidents').select('*'),
        db.from('ksp_people').select('*'),
        db.from('ksp_connections').select('*')
      ])

      if (incidentsRes.data) {
        const parsed = incidentsRes.data.map((inc: any) => ({
          ...inc,
          socio_economic_factors: typeof inc.socio_economic_factors === 'string'
            ? JSON.parse(inc.socio_economic_factors)
            : inc.socio_economic_factors
        }))
        setIncidents(parsed)
      }
      if (peopleRes.data) setPeople(peopleRes.data)
      if (connectionsRes.data) setConnections(connectionsRes.data)
    } catch (err) {
      console.error('Failed to load crimes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Filtered list
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchSearch = 
        inc.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.location.toLowerCase().includes(searchQuery.toLowerCase())

      const matchDistrict = districtFilter === 'all' || inc.district === districtFilter
      const matchCategory = categoryFilter === 'all' || inc.category === categoryFilter
      const matchPriority = priorityFilter === 'all' || inc.priority === priorityFilter

      return matchSearch && matchDistrict && matchCategory && matchPriority
    })
  }, [incidents, searchQuery, districtFilter, categoryFilter, priorityFilter])

  // Form Validation
  const validateForm = (data: Partial<Incident>) => {
    const errors: Record<string, string> = {}
    if (!data.category) errors.category = 'Category is required'
    if (!data.location) errors.location = 'Location is required'
    if (!data.district) errors.district = 'District is required'
    if (!data.police_station) errors.police_station = 'Police station is required'
    if (!data.date_time) errors.date_time = 'Date & Time is required'
    if (!data.priority) errors.priority = 'Priority is required'
    if (data.risk_score === undefined || data.risk_score < 0 || data.risk_score > 10) {
      errors.risk_score = 'Risk score must be between 0 and 10'
    }
    if (data.latitude === undefined || isNaN(Number(data.latitude))) errors.latitude = 'Valid latitude is required'
    if (data.longitude === undefined || isNaN(Number(data.longitude))) errors.longitude = 'Valid longitude is required'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Save (Create)
  const handleCreate = async () => {
    if (!validateForm(editingIncident)) return

    const newId = 'inc-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)
    const newCaseNum = 'KSP-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000)

    const payload = {
      id: newId,
      case_number: newCaseNum,
      category: editingIncident.category,
      description: editingIncident.description || '',
      location: editingIncident.location,
      district: editingIncident.district,
      police_station: editingIncident.police_station,
      latitude: Number(editingIncident.latitude),
      longitude: Number(editingIncident.longitude),
      date_time: editingIncident.date_time,
      priority: editingIncident.priority,
      modus_operandi: editingIncident.modus_operandi || '',
      socio_economic_factors: JSON.stringify(editingIncident.socio_economic_factors || {
        unemployment_rate: 6.2,
        poverty_index: 0.15,
        education_index: 0.72
      }),
      risk_score: Number(editingIncident.risk_score)
    }

    try {
      const { data, error } = await db.from('ksp_incidents').insert(payload)
      if (!error) {
        setIsAddOpen(false)
        setEditingIncident({})
        loadData()
      } else {
        alert('Failed to register incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Update
  const handleUpdate = async () => {
    if (!validateForm(editingIncident)) return

    const payload = {
      category: editingIncident.category,
      description: editingIncident.description || '',
      location: editingIncident.location,
      district: editingIncident.district,
      police_station: editingIncident.police_station,
      latitude: Number(editingIncident.latitude),
      longitude: Number(editingIncident.longitude),
      date_time: editingIncident.date_time,
      priority: editingIncident.priority,
      modus_operandi: editingIncident.modus_operandi || '',
      socio_economic_factors: JSON.stringify(editingIncident.socio_economic_factors || {}),
      risk_score: Number(editingIncident.risk_score)
    }

    try {
      const { error } = await db
        .from('ksp_incidents')
        .eq('id', editingIncident.id)
        .update(payload)

      if (!error) {
        setIsEditOpen(false)
        setEditingIncident({})
        loadData()
      } else {
        alert('Failed to update incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    try {
      // Delete child connection records first
      await db.from('ksp_connections').eq('incident_id', id).delete()
      
      // Delete incident
      const { error } = await db.from('ksp_incidents').eq('id', id).delete()
      
      if (!error) {
        setDeletingId(null)
        loadData()
      } else {
        alert('Failed to delete incident: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Get associated actors for detail drawer
  const associatedActors = useMemo(() => {
    if (!selectedIncident) return []
    const incConnections = connections.filter(c => c.incident_id === selectedIncident.id)
    return incConnections.map(c => {
      const person = people.find(p => p.id === c.person_id)
      return {
        role: c.role,
        personName: person ? person.name : 'Unknown Actor',
        classification: person ? person.classification : 'unknown',
        demographics: person ? person.demographics : null
      }
    })
  }, [selectedIncident, connections, people])

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', background: '#f6f6f3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', fontFamily: FONT_SANS }}>
        <RefreshCw size={32} className="animate-spin text-[#36375D]" />
        <div style={{ fontWeight: 600, fontSize: '15px', color: '#64748b' }}>Accessing crime records registry...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 30px', minHeight: '100vh', background: '#f6f6f3', fontFamily: FONT_SANS }}>
      
      {/* Tab Navigation header */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #dadad3', marginBottom: '24px', paddingBottom: '0' }}>
        <Link href="/admin/analytics" style={{ padding: '10px 16px', color: '#64748b', borderBottom: '3px solid transparent', fontWeight: 600, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }}>
          📈 SentinelPulse Analytics
        </Link>
        <Link href="/admin/crimes" style={{ padding: '10px 16px', color: '#36375D', borderBottom: '3px solid #36375D', fontWeight: 700, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }}>
          👮 Crime Registry
        </Link>
        <Link href="/admin/escalations" style={{ padding: '10px 16px', color: '#64748b', borderBottom: '3px solid transparent', fontWeight: 600, textDecoration: 'none', fontSize: '14px', display: 'inline-block', transition: 'all 150ms' }}>
          ⚠️ Escalations &amp; SLA
        </Link>
      </div>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#36375D', color: '#fff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Shield size={20} />
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#262622', margin: 0, letterSpacing: '-0.3px', fontFamily: FONT_DISPLAY }}>
              KSP Crime Records Manager
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
            Unified CRUD operations registry for official state incident files and linked actor entities
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: '#white',
              border: '1.5px solid #dadad3',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#262622'
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Data</span>
          </button>

          <button
            onClick={() => {
              setEditingIncident({
                category: 'theft',
                priority: 'medium',
                district: DISTRICTS[4], // Bengaluru Urban
                risk_score: 5.0,
                latitude: 12.9716,
                longitude: 77.5946,
                socio_economic_factors: {
                  unemployment_rate: 5.5,
                  poverty_index: 0.12,
                  education_index: 0.78
                }
              })
              setFormErrors({})
              setIsAddOpen(true)
            }}
            style={{
              background: '#36375D',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(54,55,93,0.15)',
            }}
          >
            <Plus size={14} />
            <span>Register Incident</span>
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #dadad3',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by case number, description, or ward..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 12px 8px 34px',
              fontSize: '12.5px',
              outline: 'none',
              color: '#000',
              fontWeight: 500
            }}
          />
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="all">All Crime Types</option>
          {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>

        {/* District filter */}
        <select
          value={districtFilter}
          onChange={e => setDistrictFilter(e.target.value)}
          style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', cursor: 'pointer', outline: 'none', minWidth: '160px' }}
        >
          <option value="all">All Districts</option>
          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Incident records list */}
      <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '16px 20px' }}>Case Number</th>
                <th style={{ padding: '16px 20px' }}>Category</th>
                <th style={{ padding: '16px 20px' }}>District</th>
                <th style={{ padding: '16px 20px' }}>Ward Location</th>
                <th style={{ padding: '16px 20px' }}>Priority</th>
                <th style={{ padding: '16px 20px' }}>Risk Score</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 500 }} className="text-center">
                    No crime incidents found matching active filters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map(inc => {
                  let badgeColor = '#475569'
                  let badgeBg = '#f1f5f9'
                  if (inc.priority === 'urgent') { badgeColor = '#b3262b'; badgeBg = '#fee2e2' }
                  else if (inc.priority === 'high') { badgeColor = '#b45309'; badgeBg = '#fef3c7' }
                  else if (inc.priority === 'medium') { badgeColor = '#024ad8'; badgeBg = '#e8f0fe' }

                  return (
                    <tr key={inc.id} style={{ borderBottom: '1px solid #dadad3', transition: 'background 100ms' }} className="hover:bg-slate-50">
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#1e293b' }}>{inc.case_number}</td>
                      <td style={{ padding: '16px 20px', textTransform: 'capitalize', fontWeight: 600 }}>{inc.category}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 500 }}>{inc.district}</td>
                      <td style={{ padding: '16px 20px', color: '#475569' }}>{inc.location}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: badgeColor, background: badgeBg, padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {inc.priority}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700 }}>{inc.risk_score.toFixed(1)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSelectedIncident(inc)
                              setIsDetailsOpen(true)
                            }}
                            title="View Connection Details"
                            style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', color: '#475569' }}
                            className="hover:bg-[#e2e8f0]"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingIncident({ ...inc })
                              setFormErrors({})
                              setIsEditOpen(true)
                            }}
                            title="Edit Incident"
                            style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', color: '#024ad8' }}
                            className="hover:bg-[#e8f0fe]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(inc.id)}
                            title="Delete Incident Record"
                            style={{ background: '#f1f5f9', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', color: '#dc2626' }}
                            className="hover:bg-[#fee2e2]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details drawer overlay */}
      {isDetailsOpen && selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 9999, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 150ms ease-out' }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#fff', height: '100%', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'scaleUp 200ms ease-out' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#36375D', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                  CASE DETAILS
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0 0', color: '#1e293b' }}>
                  {selectedIncident.case_number}
                </h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Crime Type</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize', marginTop: '2px' }}>{selectedIncident.category}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>District</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedIncident.district}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Police Station</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedIncident.police_station}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Incident Date</span>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedIncident.date_time}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Incident Description</span>
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5, margin: '6px 0 0', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {selectedIncident.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Modus Operandi</span>
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5, margin: '6px 0 0', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {selectedIncident.modus_operandi || 'No M.O. logged.'}
                </p>
              </div>

              {/* Socio-economic details */}
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Socio-Economic Threat Factors</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '8px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Unemployment</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                      {((selectedIncident.socio_economic_factors as SocioEconomicFactors)?.unemployment_rate ?? 5.0).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '8px', color: '#be123c', fontWeight: 700, textTransform: 'uppercase' }}>Poverty Index</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#9f1239', marginTop: '2px' }}>
                      {((selectedIncident.socio_economic_factors as SocioEconomicFactors)?.poverty_index ?? 0.12).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '8px', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Education index</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                      {((selectedIncident.socio_economic_factors as SocioEconomicFactors)?.education_index ?? 0.70).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected actors list */}
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Relational Actor Network</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {associatedActors.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      No actors linked to this incident in the topology graph.
                    </div>
                  ) : (
                    associatedActors.map((actor, idx) => {
                      let color = '#a855f7' // Associate (purple)
                      if (actor.classification === 'suspect') color = '#ef4444' // Suspect (red)
                      else if (actor.classification === 'victim') color = '#10b981' // Victim (green)

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={13} style={{ color }} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{actor.personName}</span>
                          </div>
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color, background: `${color}15`, padding: '2px 8px', borderRadius: '6px' }}>
                            {actor.classification}: {actor.role}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {(isAddOpen || isEditOpen) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 150ms ease-out' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', animation: 'scaleUp 180ms ease-out' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                {isAddOpen ? 'Register Crime Case' : `Edit Incident ${editingIncident.case_number}`}
              </h3>
              <button onClick={() => { setIsAddOpen(false); setIsEditOpen(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Category *</label>
                  <select
                    value={editingIncident.category || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.category ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none' }}
                  >
                    {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  {formErrors.category && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.category}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Priority *</label>
                  <select
                    value={editingIncident.priority || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.priority ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none' }}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                  {formErrors.priority && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.priority}</span>}
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>District *</label>
                  <select
                    value={editingIncident.district || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, district: e.target.value }))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: `1.5px solid ${formErrors.district ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none' }}
                  >
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {formErrors.district && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.district}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Police Station Jurisdiction *</label>
                  <input
                    type="text"
                    value={editingIncident.police_station || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, police_station: e.target.value }))}
                    placeholder="e.g. Indiranagar PS"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.police_station ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.police_station && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.police_station}</span>}
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Ward Location / Landmark *</label>
                  <input
                    type="text"
                    value={editingIncident.location || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Ward 12, Main Cross near Mall"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.location ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.location && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.location}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Risk Score (0.0 - 10.0) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editingIncident.risk_score === undefined ? '' : editingIncident.risk_score}
                    onChange={e => setEditingIncident(prev => ({ ...prev, risk_score: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.risk_score ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.risk_score && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.risk_score}</span>}
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Incident Date &amp; Time *</label>
                  <input
                    type="text"
                    value={editingIncident.date_time || ''}
                    onChange={e => setEditingIncident(prev => ({ ...prev, date_time: e.target.value }))}
                    placeholder="e.g. 2026-06-20 14:30:00"
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.date_time ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.date_time && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.date_time}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingIncident.latitude === undefined ? '' : editingIncident.latitude}
                    onChange={e => setEditingIncident(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.latitude ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.latitude && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.latitude}</span>}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingIncident.longitude === undefined ? '' : editingIncident.longitude}
                    onChange={e => setEditingIncident(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${formErrors.longitude ? '#dc2626' : '#cbd5e1'}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {formErrors.longitude && <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', display: 'block' }}>{formErrors.longitude}</span>}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  rows={2}
                  value={editingIncident.description || ''}
                  onChange={e => setEditingIncident(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Case description and logs summary..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Modus Operandi (M.O.)</label>
                <textarea
                  rows={2}
                  value={editingIncident.modus_operandi || ''}
                  onChange={e => setEditingIncident(prev => ({ ...prev, modus_operandi: e.target.value }))}
                  placeholder="e.g. Phishing emails targeting elderly, cash coercion..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Socio-economic inputs */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Socio-Economic Threat Index Parameters</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Unemployment Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={((editingIncident.socio_economic_factors as SocioEconomicFactors)?.unemployment_rate) ?? ''}
                      onChange={e => setEditingIncident(prev => ({
                        ...prev,
                        socio_economic_factors: {
                          ...(prev.socio_economic_factors as SocioEconomicFactors || {}),
                          unemployment_rate: parseFloat(e.target.value)
                        }
                      }))}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Poverty Index</label>
                    <input
                      type="number"
                      step="0.01"
                      value={((editingIncident.socio_economic_factors as SocioEconomicFactors)?.poverty_index) ?? ''}
                      onChange={e => setEditingIncident(prev => ({
                        ...prev,
                        socio_economic_factors: {
                          ...(prev.socio_economic_factors as SocioEconomicFactors || {}),
                          poverty_index: parseFloat(e.target.value)
                        }
                      }))}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Education Index</label>
                    <input
                      type="number"
                      step="0.01"
                      value={((editingIncident.socio_economic_factors as SocioEconomicFactors)?.education_index) ?? ''}
                      onChange={e => setEditingIncident(prev => ({
                        ...prev,
                        socio_economic_factors: {
                          ...(prev.socio_economic_factors as SocioEconomicFactors || {}),
                          education_index: parseFloat(e.target.value)
                        }
                      }))}
                      style={{ width: '100%', height: '34px', padding: '0 8px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false) }}
                style={{ background: '#fff', border: '1.5px solid #dadad3', borderRadius: '10px', padding: '8px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={isAddOpen ? handleCreate : handleUpdate}
                style={{ background: '#36375D', border: 'none', borderRadius: '10px', padding: '8px 20px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 120ms ease-out' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '24px', animation: 'scaleUp 120ms ease-out' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>Delete Incident Record?</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to delete this incident from the database? This action will also delete all associated actor connections and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ background: '#fff', border: '1.5px solid #dadad3', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                style={{ background: '#dc2626', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
