'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { MapPin, Bell, Search, Compass, CheckCircle2, ChevronRight, User, TrendingUp, BarChart3, Settings, Kanban, ClipboardList } from 'lucide-react'

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
}

const INITIAL_GRIEVANCES: Grievance[] = [
  { id: '#COMP-1092', citizen: 'Aarav Mehta', category: 'Water Disruption', ward: 'Ward 14 (Malleshwaram)', urgency: 'Urgent', status: 'In Progress', assignedAgent: 'Ramesh K.', assignedDept: 'Water & Sewerage', date: '2026-06-15' },
  { id: '#COMP-2104', citizen: 'Priya Sharma', category: 'Waste Overflow', ward: 'Ward 22 (Indiranagar)', urgency: 'High', status: 'Pending', assignedAgent: 'Unassigned', assignedDept: 'Solid Waste', date: '2026-06-15' },
  { id: '#COMP-3091', citizen: 'Amit Patel', category: 'Drainage Overflow', ward: 'Ward 9 (Jayanagar)', urgency: 'Urgent', status: 'Pending', assignedAgent: 'Unassigned', assignedDept: 'Water & Sewerage', date: '2026-06-14' },
  { id: '#COMP-4512', citizen: 'Rohan Sen', category: 'Broken Streetlight', ward: 'Ward 4 (Rajajinagar)', urgency: 'Medium', status: 'Resolved', assignedAgent: 'Suresh Kumar', assignedDept: 'Roads & Lights', date: '2026-06-13' },
  { id: '#COMP-5201', citizen: 'Sneha Rao', category: 'Road Damage', ward: 'Ward 12 (Koramangala)', urgency: 'High', status: 'In Progress', assignedAgent: 'Manoj S.', assignedDept: 'Roads & Lights', date: '2026-06-13' }
]

export default function UnifiedDashboard() {
  const [grievances, setGrievances] = useState<Grievance[]>(INITIAL_GRIEVANCES)
  const [activeTab, setActiveTab] = useState<'all' | 'Pending' | 'In Progress' | 'Resolved'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null)
  
  // Scoped views for Admin to manage Ward/Dept
  const [selectedWardFilter, setSelectedWardFilter] = useState('All Wards')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All Departments')

  // Agents list for assignment
  const [agentName, setAgentName] = useState('Ramesh K.')

  // Filtering logic
  const filtered = grievances.filter((g) => {
    const matchesTab = activeTab === 'all' || g.status === activeTab
    const matchesSearch = g.category.toLowerCase().includes(searchTerm.toLowerCase()) || g.id.includes(searchTerm)
    const matchesWard = selectedWardFilter === 'All Wards' || g.ward.includes(selectedWardFilter)
    const matchesDept = selectedDeptFilter === 'All Departments' || g.assignedDept === selectedDeptFilter
    return matchesTab && matchesSearch && matchesWard && matchesDept
  })

  const totalCount = grievances.length
  const pendingCount = grievances.filter((g) => g.status === 'Pending').length
  const progressCount = grievances.filter((g) => g.status === 'In Progress').length
  const resolvedCount = grievances.filter((g) => g.status === 'Resolved').length

  const handleResolve = (id: string) => {
    setGrievances(
      grievances.map((g) => (g.id === id ? { ...g, status: 'Resolved' as const } : g))
    )
    if (selectedGrievance?.id === id) {
      setSelectedGrievance({ ...selectedGrievance, status: 'Resolved' })
    }
  }

  const handleAssign = (id: string, agent: string, dept: string) => {
    setGrievances(
      grievances.map((g) => (g.id === id ? { ...g, assignedAgent: agent, assignedDept: dept, status: 'In Progress' as const } : g))
    )
    if (selectedGrievance?.id === id) {
      setSelectedGrievance({ ...selectedGrievance, assignedAgent: agent, assignedDept: dept, status: 'In Progress' })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6f6f3', // Base Background
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Header */}
      <header style={{
        background: '#262622',
        color: '#ffffff',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid #dadad3',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#e60023',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800
          }}>N</div>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px' }}>Nagaragupta.</span>
        </div>

        <nav style={{ display: 'flex', gap: '24px', marginLeft: '48px' }} className="nav-links">
          <Link href="/official/dashboard" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '13px', fontWeight: 700, borderBottom: '2px solid #e60023', paddingBottom: '4px' }}>City Overview</Link>
          <Link href="/admin/crime-intelligence" style={{ color: '#dadad3', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>KSP Crime Intel</Link>
          <Link href="/admin/link-analysis" style={{ color: '#dadad3', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>KSP Link Analysis</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e60023', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '12px' }}>SA</div>
            <div style={{ fontSize: '12px', textAlign: 'left' }} className="profile-text">
              <div style={{ fontWeight: 700 }}>Admin User</div>
              <div style={{ color: '#dadad3', fontSize: '10px' }}>Super Admin</div>
            </div>
          </div>
          <Link href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontSize: '12px', fontWeight: 700, marginLeft: '12px' }}>Logout</Link>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '24px'
      }} className="main-grid">
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Live Map */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)',
            height: '320px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Grievance Heatmap & Locations</h3>
              <div style={{ fontSize: '11px', color: '#e60023', fontWeight: 700 }}>
                ● Command Center Active
              </div>
            </div>
            
            <div style={{
              flex: 1,
              background: '#6D9998', // Teal map background
              borderRadius: '16px',
              border: '1px solid #dadad3',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '12px', background: 'rgba(4,4,6,0.6)', padding: '6px 12px', borderRadius: '20px', zIndex: 10 }}>
                Interactive map simulated: All Wards covered
              </span>
            </div>
          </div>

          {/* Grievance Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'Pending', 'In Progress', 'Resolved'] as const).map((tab) => {
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: 'none',
                        background: isActive ? '#000000' : 'transparent',
                        color: isActive ? '#ffffff' : '#000000',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  )
                })}
              </div>

              {/* Scoped dropdown filters to enable Ward/Dept filtering for Admin */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={selectedWardFilter}
                  onChange={(e) => setSelectedWardFilter(e.target.value)}
                  style={{ height: '32px', borderRadius: '6px', border: '1px solid #dadad3', fontSize: '11px', fontWeight: 600 }}
                >
                  <option value="All Wards">All Wards</option>
                  <option value="Ward 14">Ward 14 (Malleshwaram)</option>
                  <option value="Ward 22">Ward 22 (Indiranagar)</option>
                  <option value="Ward 9">Ward 9 (Jayanagar)</option>
                </select>

                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  style={{ height: '32px', borderRadius: '6px', border: '1px solid #dadad3', fontSize: '11px', fontWeight: 600 }}
                >
                  <option value="All Departments">All Departments</option>
                  <option value="Solid Waste">Solid Waste</option>
                  <option value="Water & Sewerage">Water & Sewerage</option>
                  <option value="Roads & Lights">Roads & Lights</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #dadad3', color: '#262622', fontWeight: 600 }}>
                    <th style={{ padding: '10px 8px' }}>ID</th>
                    <th style={{ padding: '10px 8px' }}>Category</th>
                    <th style={{ padding: '10px 8px' }}>Ward</th>
                    <th style={{ padding: '10px 8px' }}>Dept</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <tr
                      key={g.id}
                      onClick={() => setSelectedGrievance(g)}
                      style={{
                        borderBottom: '1px solid #f6f6f3',
                        cursor: 'pointer',
                        background: selectedGrievance?.id === g.id ? 'rgba(230, 0, 35, 0.04)' : 'transparent'
                      }}
                      className="table-row"
                    >
                      <td style={{ padding: '12px 8px', fontWeight: 700, color: '#e60023' }}>{g.id}</td>
                      <td style={{ padding: '12px 8px' }}>{g.category}</td>
                      <td style={{ padding: '12px 8px', color: '#262622' }}>{g.ward}</td>
                      <td style={{ padding: '12px 8px', fontSize: '12px' }}>{g.assignedDept}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: g.status === 'Resolved' ? '#7B8F65' : g.status === 'In Progress' ? '#6D9998' : '#e60023'
                        }}>{g.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Action / Detail Panel */}
          {selectedGrievance ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #e60023',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(230, 0, 35, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e60023', fontFamily: 'monospace' }}>{selectedGrievance.id}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '16px',
                  background: 'rgba(230, 0, 35, 0.08)',
                  color: '#e60023'
                }}>{selectedGrievance.status}</span>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>{selectedGrievance.category}</h4>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <div>Citizen: <strong>{selectedGrievance.citizen}</strong></div>
                <div>Location: <strong>{selectedGrievance.ward}</strong></div>
                <div>Department: <strong>{selectedGrievance.assignedDept}</strong></div>
                <div>Assigned Agent: <strong>{selectedGrievance.assignedAgent}</strong></div>
              </div>

              {selectedGrievance.status !== 'Resolved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f6f6f3', paddingTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Dispatch Field Agent / Team</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        style={{ flex: 1, height: '34px', border: '1px solid #dadad3', borderRadius: '6px', fontSize: '12px' }}
                      >
                        <option value="Ramesh K.">Ramesh K. (SWM North Team 1)</option>
                        <option value="Suresh Kumar">Suresh Kumar (Electrician)</option>
                        <option value="Manoj S.">Manoj S. (BBMP Inspector)</option>
                      </select>
                      <button
                        onClick={() => handleAssign(selectedGrievance.id, agentName, selectedGrievance.assignedDept)}
                        style={{
                          padding: '0 12px',
                          background: '#e60023',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolve(selectedGrievance.id)}
                    style={{
                      height: '36px',
                      background: '#7B8F65',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Resolve Complaint
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedGrievance(null)}
                style={{
                  width: '100%',
                  height: '32px',
                  background: 'transparent',
                  border: '1px solid #dadad3',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#000000',
                  marginTop: '12px'
                }}
              >
                Close Panel
              </button>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #dadad3',
              padding: '24px',
              textAlign: 'center',
              color: '#262622',
              fontSize: '13px'
            }}>
              💡 Select any row in the table to dispatch agents and manage status.
            </div>
          )}

          {/* Status Performance */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Status Performance Overview</span>
              <span style={{ fontSize: '11px', color: '#262622' }}>Active</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Resolved ({resolvedCount})</span>
                  <strong>{totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}%</strong>
                </div>
                <div style={{ height: '8px', background: '#f6f6f3', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#7B8F65', width: `${totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>In Progress ({progressCount})</span>
                  <strong>{totalCount > 0 ? Math.round((progressCount / totalCount) * 100) : 0}%</strong>
                </div>
                <div style={{ height: '8px', background: '#f6f6f3', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#6D9998', width: `${totalCount > 0 ? (progressCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Pending ({pendingCount})</span>
                  <strong>{totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%</strong>
                </div>
                <div style={{ height: '8px', background: '#f6f6f3', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#e60023', width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Department loads */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>Department Active Loads</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Solid Waste Department</span>
                <strong>{grievances.filter(g => g.assignedDept === 'Solid Waste' && g.status !== 'Resolved').length} Active</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Water & Sewerage</span>
                <strong>{grievances.filter(g => g.assignedDept === 'Water & Sewerage' && g.status !== 'Resolved').length} Active</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Roads & Lights</span>
                <strong>{grievances.filter(g => g.assignedDept === 'Roads & Lights' && g.status !== 'Resolved').length} Active</strong>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '32px 0 24px 0',
        fontSize: '11px',
        color: '#262622',
        borderTop: '1px solid #dadad3',
        marginTop: '40px'
      }}>
        © 2026 Nagaragupta Civic Operations Control. All rights reserved.
      </footer>

      <style>{`
        .table-row:hover {
          background-color: rgba(230, 0, 35, 0.02) !important;
        }
        @media (max-width: 768px) {
          .main-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .nav-links, .profile-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
