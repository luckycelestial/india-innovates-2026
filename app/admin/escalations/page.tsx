'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Clock, AlertTriangle, ShieldAlert, CheckCircle2, 
  Search, ArrowUpRight, RefreshCw, ShieldCheck, 
  User, Building2, HelpCircle, ArrowRight, CornerDownRight 
} from 'lucide-react'

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

type DepartmentDelay = {
  name: string
  totalOpen: number
  overdue: number
  avgHoursSpent: number
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function getSlaDurationHours(priority: string): number {
  switch (priority) {
    case 'urgent': return 24
    case 'high': return 48
    case 'medium': return 120 // 5 days
    case 'low': return 168 // 7 days
    default: return 120
  }
}

function getSlaDueTime(createdAtStr: string, priority: string): number {
  const createdAt = new Date(createdAtStr)
  const durationMs = getSlaDurationHours(priority) * 60 * 60 * 1000
  return createdAt.getTime() + durationMs
}

export default function EscalationSlaMonitorPage() {
  const supabase = createClient()

  // State
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Selected complaint for actions modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [modalAction, setModalAction] = useState<'deescalate' | 'reassign' | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setComplaints(data)
      }
    } catch (e) {
      console.error('Error fetching complaints:', e)
    }
  }

  // Initial load
  const loadData = async () => {
    setLoading(true)
    await fetchComplaints()
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // Update current time every minute for SLA updates
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchComplaints()
    setRefreshing(false)
  }

  // Handle action (de-escalate or reassign)
  const handlePerformAction = async () => {
    if (!selectedComplaint || !modalAction) return
    setIsSubmittingAction(true)

    try {
      const timestamp = new Date().toISOString()
      const updatePayload: any = {
        updated_at: timestamp,
        notes: actionNotes.trim() 
          ? `${selectedComplaint.notes || ''}\n[Admin Action - ${modalAction === 'deescalate' ? 'De-escalated' : 'Reassigned'}]: ${actionNotes.trim()}`
          : selectedComplaint.notes
      }

      if (modalAction === 'deescalate') {
        // Change status from escalated back to assigned or in_progress
        updatePayload.status = 'assigned'
      } else if (modalAction === 'reassign') {
        // Just updating the updated_at timestamp and resetting assignment status
        updatePayload.status = 'assigned'
        updatePayload.assigned_to = null // Re-routes to queue
      }

      const { error } = await supabase
        .from('complaints')
        .update(updatePayload)
        .eq('id', selectedComplaint.id)

      if (!error) {
        alert(`Successfully ${modalAction === 'deescalate' ? 'de-escalated' : 're-routed'} complaint ${selectedComplaint.complaint_number}`)
        setSelectedComplaint(null)
        setModalAction(null)
        setActionNotes('')
        fetchComplaints()
      } else {
        alert('Action failed: ' + error.message)
      }
    } catch (e) {
      alert('Error updating complaint')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Helper logic to classify complaint risk and timing
  const getComplaintState = (c: Complaint) => {
    if (c.status === 'resolved' || c.status === 'closed') {
      return { state: 'resolved', label: 'Resolved', color: '#166534', bg: '#dcfce7' }
    }
    if (c.status === 'escalated') {
      return { state: 'escalated', label: 'Escalated', color: '#dc2626', bg: '#fee2e2' }
    }

    const dueTime = getSlaDueTime(c.created_at, c.priority)
    const diffMs = dueTime - currentTime
    const remainingHours = diffMs / (1000 * 60 * 60)

    if (remainingHours < 0) {
      return { state: 'overdue', label: 'Overdue', color: '#b3262b', bg: '#fee2e2' }
    }
    if (remainingHours <= 2) {
      return { state: 'at_risk', label: 'At Risk (<2h)', color: '#dc2626', bg: '#ffedd5' }
    }
    if (remainingHours <= 12) {
      return { state: 'warning', label: 'Warning (<12h)', color: '#d97706', bg: '#fef3c7' }
    }
    return { state: 'on_track', label: 'On Track', color: '#166534', bg: '#e8f5e9' }
  }

  const getSlaTimingDetails = (c: Complaint) => {
    if (c.status === 'resolved' || c.status === 'closed') {
      return { text: 'SLA Met', isOverdue: false }
    }

    const dueTime = getSlaDueTime(c.created_at, c.priority)
    const diffMs = dueTime - currentTime
    const absoluteHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
    const absoluteDays = Math.floor(absoluteHours / 24)

    if (diffMs < 0) {
      if (absoluteHours < 24) {
        return { text: `${absoluteHours}h overdue`, isOverdue: true }
      }
      return { text: `${absoluteDays}d overdue`, isOverdue: true }
    } else {
      if (absoluteHours < 24) {
        return { text: `${absoluteHours}h left`, isOverdue: false }
      }
      return { text: `${absoluteDays}d left`, isOverdue: false }
    }
  }

  const getStuckDetails = (c: Complaint) => {
    if (c.status === 'resolved' || c.status === 'closed') {
      return { isStuck: false, hours: 0 }
    }
    const lastUpdate = new Date(c.updated_at).getTime()
    const diffMs = currentTime - lastUpdate
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    return { isStuck: hours >= 24, hours }
  }

  // 1. COMPUTATIONS FOR SUMMARY CARDS
  const openComplaints = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed')
  const totalOpenCount = openComplaints.length

  const overdueCount = openComplaints.filter(c => {
    const info = getComplaintState(c)
    return info.state === 'overdue'
  }).length

  const atRiskCount = openComplaints.filter(c => {
    const info = getComplaintState(c)
    return info.state === 'at_risk'
  }).length

  const escalatedCount = openComplaints.filter(c => c.status === 'escalated').length

  const stuckCount = openComplaints.filter(c => {
    const stuckInfo = getStuckDetails(c)
    return stuckInfo.isStuck
  }).length

  // 2. COMPUTATIONS FOR DEPARTMENT BREAKDOWN
  const depts = ['Sanitation Department', 'Water Supply Board', 'Electricity Board', 'Public Works Department']
  const departmentStats: DepartmentDelay[] = depts.map(deptName => {
    const deptComplaints = complaints.filter(c => c.department === deptName)
    const openInDept = deptComplaints.filter(c => c.status !== 'resolved' && c.status !== 'closed')
    
    const overdueInDept = openInDept.filter(c => {
      const stateInfo = getComplaintState(c)
      return stateInfo.state === 'overdue'
    }).length

    // Calculate average time spent for unresolved complaints in this department
    let totalUnresolvedHours = 0
    openInDept.forEach(c => {
      const created = new Date(c.created_at).getTime()
      totalUnresolvedHours += (currentTime - created) / (1000 * 60 * 60)
    })
    const avgHours = openInDept.length > 0 ? Math.round(totalUnresolvedHours / openInDept.length) : 0

    return {
      name: deptName,
      totalOpen: openInDept.length,
      overdue: overdueInDept,
      avgHoursSpent: avgHours
    }
  })

  // 3. COMPLAINTS LIST FILTERING
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesDept = deptFilter === 'all' || c.department === deptFilter
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter
    
    let matchesRisk = true
    if (riskFilter !== 'all') {
      const riskInfo = getComplaintState(c)
      matchesRisk = riskInfo.state === riskFilter
    }

    return matchesSearch && matchesDept && matchesPriority && matchesRisk
  })

  // 4. ESCALATION LOG DATA
  const escalatedComplaints = openComplaints.filter(c => c.status === 'escalated')

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ height: '120px', background: '#e2e8f0', borderRadius: '12px', marginBottom: '24px' }}></div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '38px', color: '#0f172a', lineHeight: 1.2 }}>
              Escalation &amp; SLA Monitor
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#475569', marginTop: '6px', lineHeight: 1.6, fontWeight: 400 }}>
              Track overdue tickets, stuck workflows, and resolve operational delays.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 120ms'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Monitor'}
          </button>
        </div>

        {/* 1. SLA Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Card: Overdue */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overdue Tickets</span>
              <span style={{ padding: '6px', borderRadius: '50%', background: '#fee2e2', color: '#b3262b' }}><AlertTriangle size={18} /></span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: overdueCount > 0 ? '#b3262b' : '#0f172a' }}>
              {overdueCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Requires immediate action
            </div>
          </div>

          {/* Card: At Risk */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>At Risk (&lt;2h)</span>
              <span style={{ padding: '6px', borderRadius: '50%', background: '#ffedd5', color: '#ea580c' }}><Clock size={18} /></span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: atRiskCount > 0 ? '#ea580c' : '#0f172a' }}>
              {atRiskCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Nearing SLA limit
            </div>
          </div>

          {/* Card: Escalated */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Escalated Cases</span>
              <span style={{ padding: '6px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626' }}><ShieldAlert size={18} /></span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: escalatedCount > 0 ? '#dc2626' : '#0f172a' }}>
              {escalatedCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Assigned to department head
            </div>
          </div>

          {/* Card: Stuck */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stuck (&gt;24h)</span>
              <span style={{ padding: '6px', borderRadius: '50%', background: '#f1f5f9', color: '#475569' }}><RefreshCw size={18} /></span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: stuckCount > 0 ? '#475569' : '#0f172a' }}>
              {stuckCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              No updates in 24 hours
            </div>
          </div>

          {/* Card: Total Open */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Active Open</span>
              <span style={{ padding: '6px', borderRadius: '50%', background: '#e8f0fe', color: '#024ad8' }}><Building2 size={18} /></span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: '#024ad8' }}>
              {totalOpenCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Active operational workload
            </div>
          </div>
        </div>

        {/* 2. Top-Level Layout Split: Department Performance and SLA Trend Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
          
          {/* Department Performance and Delay Panel */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              Departmental Workload &amp; Delays
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Real-time audit of queue sizes, overdue rates, and average resolution times.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {departmentStats.map(dept => {
                const overduePercentage = dept.totalOpen > 0 ? Math.round((dept.overdue / dept.totalOpen) * 100) : 0
                return (
                  <div key={dept.name} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                        🏢 {dept.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                        Avg Age: {dept.avgHoursSpent}h
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#475569' }}>{dept.totalOpen}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>Open</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: dept.overdue > 0 ? '#b3262b' : '#166534' }}>{dept.overdue}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>Overdue</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: overduePercentage > 30 ? '#b3262b' : '#475569' }}>{overduePercentage}%</div>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>Delay Rate</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SLA Trend Custom Chart */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              SLA Compliance Trend
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
              Breakdown of active complaint SLA performance across all priority classes.
            </p>

            {/* Custom SVG Bar Chart */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '220px' }}>
              <svg viewBox="0 0 400 220" style={{ width: '100%', height: 'auto', maxHeight: '240px' }}>
                {/* Grid Lines */}
                <line x1="40" y1="20" x2="360" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="70" x2="360" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="120" x2="360" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="170" x2="360" y2="170" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                {/* Y Axis labels */}
                <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">High</text>
                <text x="30" y="124" fill="#94a3b8" fontSize="10" textAnchor="end">Mid</text>
                <text x="30" y="174" fill="#94a3b8" fontSize="10" textAnchor="end">Zero</text>

                {/* Data Bars */}
                {/* 1. Overdue (Red) */}
                <rect x="70" y={170 - Math.min(130, overdueCount * 25)} width="40" height={Math.min(130, overdueCount * 25)} fill="#ef4444" rx="4" />
                <text x="90" y="190" fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle">Overdue</text>
                <text x="90" y={160 - Math.min(130, overdueCount * 25)} fill="#dc2626" fontSize="12" fontWeight="800" textAnchor="middle">{overdueCount}</text>

                {/* 2. At Risk (Amber) */}
                <rect x="150" y={170 - Math.min(130, atRiskCount * 25)} width="40" height={Math.min(130, atRiskCount * 25)} fill="#f97316" rx="4" />
                <text x="170" y="190" fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle">At Risk</text>
                <text x="170" y={160 - Math.min(130, atRiskCount * 25)} fill="#d97706" fontSize="12" fontWeight="800" textAnchor="middle">{atRiskCount}</text>

                {/* 3. Escalated (Purple) */}
                <rect x="230" y={170 - Math.min(130, escalatedCount * 25)} width="40" height={Math.min(130, escalatedCount * 25)} fill="#a855f7" rx="4" />
                <text x="250" y="190" fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle">Escalated</text>
                <text x="250" y={160 - Math.min(130, escalatedCount * 25)} fill="#7c3aed" fontSize="12" fontWeight="800" textAnchor="middle">{escalatedCount}</text>

                {/* 4. On Track (Green) */}
                {(() => {
                  const onTrackCount = openComplaints.length - overdueCount - atRiskCount - escalatedCount
                  return (
                    <>
                      <rect x="310" y={170 - Math.min(130, onTrackCount * 15)} width="40" height={Math.min(130, onTrackCount * 15)} fill="#22c55e" rx="4" />
                      <text x="330" y="190" fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle">On Track</text>
                      <text x="330" y={160 - Math.min(130, onTrackCount * 15)} fill="#166534" fontSize="12" fontWeight="800" textAnchor="middle">{onTrackCount}</text>
                    </>
                  )
                })()}

                {/* X Axis Line */}
                <line x1="40" y1="170" x2="370" y2="170" stroke="#cbd5e1" strokeWidth="2" />
              </svg>
            </div>
            
            <div style={{
              marginTop: '16px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#64748b'
            }}>
              <span>Target SLA compliance: <strong>95%</strong></span>
              <span style={{ color: overdueCount > 0 ? '#b3262b' : '#166534', fontWeight: 700 }}>
                {overdueCount > 0 ? '⚠️ Action Required' : '✓ SLA Healthy'}
              </span>
            </div>
          </div>

        </div>

        {/* 3. Escalation Log Panel */}
        {escalatedComplaints.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#dc2626' }}><ShieldAlert size={20} /></span>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '20px', color: '#0f172a' }}>
                Active Escalations Queue
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Complaints escalated by officers or automatically triggered by SLA breach rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {escalatedComplaints.map(c => {
                const slaInfo = getSlaTimingDetails(c)
                return (
                  <div key={c.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                          {c.complaint_number}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{c.title}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>🏢 {c.department}</span>
                        <span>•</span>
                        <span style={{ color: '#b3262b', fontWeight: 600 }}>⚠️ {slaInfo.text}</span>
                        <span>•</span>
                        <span>Updated: {new Date(c.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedComplaint(c)
                          setModalAction('deescalate')
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 120ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#0f172a'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                      >
                        <ShieldCheck size={14} />
                        De-escalate
                      </button>
                      <button
                        onClick={() => {
                          setSelectedComplaint(c)
                          setModalAction('reassign')
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 120ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <CornerDownRight size={14} />
                        Reassign
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. Stuck Complaints Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          
          {/* Table Header and Filters */}
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>
              Delayed &amp; Stuck Complaint Queue
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Monitor and filter tickets currently flagged for SLA issues, pending review, or awaiting assignment.
            </p>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}><Search size={16} /></span>
                <input
                  type="text"
                  placeholder="Search by ID or Title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px 0 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: FONT_SANS
                  }}
                />
              </div>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Departments</option>
                {depts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* SLA Risk Filter */}
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Risk States</option>
                <option value="overdue">Overdue</option>
                <option value="at_risk">At Risk (&lt;2h)</option>
                <option value="warning">Warning (&lt;12h)</option>
                <option value="escalated">Escalated</option>
                <option value="on_track">On Track</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

            </div>
          </div>

          {/* Table Data */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '14px 20px' }}>Complaint ID</th>
                  <th style={{ padding: '14px 20px' }}>Title</th>
                  <th style={{ padding: '14px 20px' }}>Department</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>SLA Status</th>
                  <th style={{ padding: '14px 20px' }}>Timing Details</th>
                  <th style={{ padding: '14px 20px' }}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No delayed complaints found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map(c => {
                    const stateInfo = getComplaintState(c)
                    const timingInfo = getSlaTimingDetails(c)
                    const stuckInfo = getStuckDetails(c)

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: stuckInfo.isStuck ? '#fffbeb' : 'transparent',
                          transition: 'background 100ms'
                        }}
                        onMouseEnter={e => { if (!stuckInfo.isStuck) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                        onMouseLeave={e => { if (!stuckInfo.isStuck) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontWeight: 800, color: '#024ad8' }}>
                            {c.complaint_number}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>
                            Category: {c.category}
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                          🏢 {c.department || 'Unassigned'}
                        </td>
                        <td style={{ padding: '14px 20px', textTransform: 'capitalize' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: c.status === 'escalated' ? '#fee2e2' : '#f1f5f9',
                            color: c.status === 'escalated' ? '#b3262b' : '#475569'
                          }}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            color: stateInfo.color,
                            background: stateInfo.bg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stateInfo.color }} />
                            {stateInfo.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontWeight: timingInfo.isOverdue ? 700 : 500,
                            color: timingInfo.isOverdue ? '#b3262b' : '#475569'
                          }}>
                            {timingInfo.text}
                          </span>
                          {stuckInfo.isStuck && (
                            <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                              ⚠️ Stuck {stuckInfo.hours}h
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#64748b' }}>
                          {new Date(c.updated_at).toLocaleString()}
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

      {/* Action Dialog (Modal) */}
      {selectedComplaint && modalAction && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
                {modalAction === 'deescalate' ? 'De-escalate Complaint' : 'Reassign & Route Complaint'}
              </h3>
              <button onClick={() => {
                setSelectedComplaint(null)
                setModalAction(null)
              }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#024ad8' }}>{selectedComplaint.complaint_number}</span>
                <h4 style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px', color: '#0f172a' }}>{selectedComplaint.title}</h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Current Status: <strong style={{ textTransform: 'capitalize' }}>{selectedComplaint.status}</strong> | Department: {selectedComplaint.department}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Operational Actions Notes
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={modalAction === 'deescalate' 
                    ? 'Enter reasons for de-escalating this grievance (e.g. initial resolution steps performed)...' 
                    : 'Enter instructions for re-assignment (e.g. routing back to primary queue due to inactivity)...'}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: FONT_SANS
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setSelectedComplaint(null)
                    setModalAction(null)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingAction}
                  onClick={handlePerformAction}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: modalAction === 'deescalate' ? '#166534' : '#dc2626',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingAction ? 'Processing...' : modalAction === 'deescalate' ? 'Confirm De-escalation' : 'Confirm Reassignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
