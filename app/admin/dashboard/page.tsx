'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import KpiCardGrid from '@/components/admin/kpi-card-grid'
import ComplaintTrendChart from '@/components/admin/complaint-trend-chart'
import DepartmentPerformanceTable from '@/components/admin/department-performance-table'
import OverdueComplaintsPanel from '@/components/admin/overdue-complaints-panel'
import QuickActionsPanel from '@/components/admin/quick-actions-panel'

type Complaint = {
  id: string
  complaint_number: string
  title: string
  category: string
  description: string | null
  status: string
  priority: string
  location: string
  department: string | null
  created_at: string
  updated_at: string
  notes: string | null
}

const FONT_DISPLAY = "var(--font-display)"
const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function getSlaDueTime(createdAtStr: string, priority: string) {
  const createdAt = new Date(createdAtStr)
  let durationMs = 0
  switch (priority) {
    case 'urgent': durationMs = 24 * 60 * 60 * 1000; break
    case 'high': durationMs = 48 * 60 * 60 * 1000; break
    case 'medium': durationMs = 5 * 24 * 60 * 60 * 1000; break
    case 'low': durationMs = 7 * 24 * 60 * 60 * 1000; break
    default: durationMs = 5 * 24 * 60 * 60 * 1000
  }
  return createdAt.getTime() + durationMs
}

function formatSlaText(createdAtStr: string, priority: string) {
  const dueTimeMs = getSlaDueTime(createdAtStr, priority)
  const now = new Date().getTime()
  const diffMs = now - dueTimeMs
  const hoursOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
  if (hoursOverdue < 24) {
    return `Overdue by ${hoursOverdue}h`
  } else {
    const daysOverdue = Math.floor(hoursOverdue / 24)
    return `Overdue by ${daysOverdue}d`
  }
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let channel: any = null

    const fetchComplaints = async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })

      if (active && !error && data) {
        setComplaints(data)
      }
    }

    const load = async () => {
      await fetchComplaints()
      if (active) setLoading(false)

      const channelName = `admin_dashboard_changes_${Math.random().toString(36).substring(2, 9)}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'complaints' },
          () => {
            fetchComplaints()
          }
        )
        .subscribe()
    }

    load()

    return () => {
      active = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // -- COMPUTATIONS --
  const total = complaints.length
  const resolved = complaints.filter(c => c.status === 'resolved').length
  const closed = complaints.filter(c => c.status === 'closed').length
  const totalResolved = resolved + closed
  
  const openComplaintsList = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed')
  const openCount = openComplaintsList.length
  const escalated = complaints.filter(c => c.status === 'escalated').length

  const overdueList = openComplaintsList.filter(c => {
    const dueTime = getSlaDueTime(c.created_at, c.priority)
    return new Date().getTime() > dueTime
  })
  const overdueCount = overdueList.length

  // Status counts for chart
  const statusCounts = complaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Category counts for chart
  const categoryCounts = complaints.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Department workload grouping
  const deptMap: Record<string, { total: number; open: number; resolved: number; overdue: number }> = {}
  complaints.forEach(c => {
    const dept = c.department || 'General Administration'
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, open: 0, resolved: 0, overdue: 0 }
    }
    const stats = deptMap[dept]
    stats.total += 1
    const isOpen = c.status !== 'resolved' && c.status !== 'closed'
    if (isOpen) {
      stats.open += 1
      const dueTime = getSlaDueTime(c.created_at, c.priority)
      if (new Date().getTime() > dueTime) {
        stats.overdue += 1
      }
    } else {
      stats.resolved += 1
    }
  })

  const departmentStats = Object.entries(deptMap).map(([name, stats]) => ({
    name,
    total: stats.total,
    open: stats.open,
    resolved: stats.resolved,
    overdue: stats.overdue,
    rate: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0
  })).sort((a, b) => b.total - a.total)

  // Critical overdue and escalated complaints for the escalation panel
  const criticalComplaints = complaints
    .filter(c => (c.status === 'escalated' || overdueList.some(o => o.id === c.id)) && c.status !== 'resolved' && c.status !== 'closed')
    .map(c => ({
      id: c.id,
      complaint_number: c.complaint_number,
      title: c.title,
      status: c.status,
      priority: c.priority,
      department: c.department,
      created_at: c.created_at,
      slaText: c.status === 'escalated' ? 'Escalated' : formatSlaText(c.created_at, c.priority)
    }))
    .slice(0, 5)

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: '90px', background: '#e2e8f0', borderRadius: '8px' }}></div>
            ))}
          </div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Block */}
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
              Administrative Console
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#475569', marginTop: '8px', lineHeight: 1.6, fontWeight: 400 }}>
              Real-time civic operations and departmental workflow oversight dashboard.
            </p>
          </div>
        </div>

        {/* Top level metrics grid */}
        <KpiCardGrid
          total={total}
          open={openCount}
          resolved={totalResolved}
          overdue={overdueCount}
          escalated={escalated}
        />

        {/* Charts Section */}
        <ComplaintTrendChart
          statusCounts={statusCounts}
          categoryCounts={categoryCounts}
        />

        {/* Bottom row layouts: Department Workload Table & Overdue panel + Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {/* Department Performance */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <DepartmentPerformanceTable stats={departmentStats} />
          </div>

          {/* Sidebar Panels (Escalations + Quick Actions) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <OverdueComplaintsPanel complaints={criticalComplaints} />
            <QuickActionsPanel />
          </div>
        </div>

      </div>
    </main>
  )
}
