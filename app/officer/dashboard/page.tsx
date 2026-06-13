'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusUpdateModal from '@/components/officer/status-update-modal'
import { 
  Search, AlertCircle, MapPin, FolderOpen, ClipboardList,
  FileText, Inbox, Settings, Eye, CheckCircle2, Lock, AlertTriangle, HelpCircle,
  Route, Droplet, Zap, Trash2, Lightbulb, Waves, Trees, Volume2
} from 'lucide-react'

type Complaint = {
  id: string
  complaint_number: string
  title: string
  category: string
  description: string | null
  status: string
  priority: string
  location: string
  created_at: string
  updated_at: string
  assigned_to: string | null
  notes: string | null
  is_anonymous?: boolean
  department?: string | null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  submitted:      { label: 'Submitted',      color: '#475569', bg: '#f1f5f9', icon: FileText },
  assigned:       { label: 'Assigned',       color: '#024ad8', bg: '#e8f0fe', icon: Inbox },
  in_progress:    { label: 'In Progress',    color: '#b45309', bg: '#fef3c7', icon: Settings },
  pending_review: { label: 'Pending Review', color: '#7c3aed', bg: '#f3e8ff', icon: Eye },
  resolved:       { label: 'Resolved',       color: '#166534', bg: '#dcfce7', icon: CheckCircle2 },
  closed:         { label: 'Closed',         color: '#636363', bg: '#f7f7f7', icon: Lock },
  escalated:      { label: 'Escalated',      color: '#dc2626', bg: '#fee2e2', icon: AlertTriangle },
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#475569', bg: '#f1f5f9' },
  medium: { label: 'Medium', color: '#024ad8', bg: '#e8f0fe' },
  high:   { label: 'High',   color: '#b45309', bg: '#fef3c7' },
  urgent: { label: 'Urgent', color: '#b3262b', bg: '#fee2e2' },
}

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  road: Route, water: Droplet, electricity: Zap, sanitation: Trash2,
  streetlight: Lightbulb, drainage: Waves, waste: Trash2, parks: Trees, noise: Volume2, other: ClipboardList,
}

const CAT_LABEL: Record<string, string> = {
  road: 'Road & Pavement', water: 'Water Supply', electricity: 'Electricity',
  sanitation: 'Sanitation & Cleanliness', streetlight: 'Street Lighting',
  drainage: 'Drainage & Waterlogging', waste: 'Solid Waste Management',
  parks: 'Parks & Public Spaces', noise: 'Noise Pollution', other: 'Other',
}

const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function getPriorityWeight(p: string) {
  switch (p) {
    case 'urgent': return 4
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    default: return 0
  }
}

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

function formatSlaIndicator(createdAtStr: string, priority: string, status: string) {
  if (status === 'resolved' || status === 'closed') {
    return { text: 'Met ✓', color: '#166534', bg: '#dcfce7', isOverdue: false }
  }

  const dueTimeMs = getSlaDueTime(createdAtStr, priority)
  const now = new Date().getTime()
  const diffMs = dueTimeMs - now

  if (diffMs < 0) {
    const hoursOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
    if (hoursOverdue < 24) {
      return { text: `Overdue by ${hoursOverdue}h`, color: '#b3262b', bg: '#fee2e2', isOverdue: true }
    } else {
      const daysOverdue = Math.floor(hoursOverdue / 24)
      return { text: `Overdue by ${daysOverdue}d`, color: '#b3262b', bg: '#fee2e2', isOverdue: true }
    }
  } else {
    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
    if (hoursRemaining < 24) {
      return { text: `Due in ${hoursRemaining}h`, color: '#b45309', bg: '#fef3c7', isOverdue: false }
    } else {
      const daysRemaining = Math.floor(hoursRemaining / 24)
      return { text: `Due in ${daysRemaining}d`, color: '#024ad8', bg: '#e8f0fe', isOverdue: false }
    }
  }
}

export default function OfficerDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [overdueFilter, setOverdueFilter] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<'my' | 'all'>('my')
  const [sortBy, setSortBy] = useState('newest')
  const [officerId, setOfficerId] = useState<string | null>(null)

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Priya Nair's mock ID (will fall back if not signed in)
  const OFFICER_ID = '5af1a48c-e56a-4886-8379-110b99feb069'

  useEffect(() => {
    let active = true
    let channel: any = null

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      const currentId = user?.id ?? OFFICER_ID
      setOfficerId(currentId)

      const fetchComplaints = async () => {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false })

        if (active && !error && data) {
          setComplaints(data)
        }
      }

      await fetchComplaints()
      if (active) setLoading(false)

      const channelName = `officer_dashboard_changes_${Math.random().toString(36).substring(2, 9)}`
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

  // Filter complaints list
  const filtered = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.complaint_number.toLowerCase().includes(search.toLowerCase()) ||
                          c.location.toLowerCase().includes(search.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter
    const matchesLocation = locationFilter === 'all' || c.location === locationFilter
    const matchesScope = scopeFilter === 'all' || c.assigned_to === officerId || !c.assigned_to

    let matchesOverdue = true
    if (overdueFilter) {
      const dueTime = getSlaDueTime(c.created_at, c.priority)
      matchesOverdue = new Date().getTime() > dueTime && c.status !== 'resolved' && c.status !== 'closed'
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesLocation && matchesScope && matchesOverdue
  })

  // Sort complaints
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (sortBy === 'urgent') {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
    }
    if (sortBy === 'overdue') {
      const dueA = getSlaDueTime(a.created_at, a.priority)
      const dueB = getSlaDueTime(b.created_at, b.priority)
      return dueA - dueB
    }
    return 0
  })

  // Stats Counters (based on active assigned list)
  const myAssigned = complaints.filter(c => c.assigned_to === officerId)
  const pendingCount = myAssigned.filter(c => c.status === 'submitted' || c.status === 'assigned').length
  const inProgressCount = myAssigned.filter(c => c.status === 'in_progress').length
  
  const overdueCount = myAssigned.filter(c => {
    const dueTime = getSlaDueTime(c.created_at, c.priority)
    return new Date().getTime() > dueTime && c.status !== 'resolved' && c.status !== 'closed'
  }).length

  const resolvedTodayCount = myAssigned.filter(c => {
    if (c.status !== 'resolved') return false
    const updatedAt = new Date(c.updated_at || c.created_at)
    return updatedAt.toDateString() === new Date().toDateString()
  }).length

  const uniqueWards = Array.from(new Set(complaints.map(c => c.location).filter(Boolean)))
  const uniqueCategories = Array.from(new Set(complaints.map(c => c.category).filter(Boolean)))

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
              Assigned Complaints
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#475569', marginTop: '8px', lineHeight: 1.6, fontWeight: 400 }}>
              Operational queue for managing citizen grievances and monitoring service levels.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Scope selection buttons */}
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
              <button
                onClick={() => setScopeFilter('my')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: scopeFilter === 'my' ? '#ffffff' : 'transparent',
                  color: scopeFilter === 'my' ? '#0f172a' : '#475569',
                  fontWeight: 600,
                  fontSize: '14px',
                  fontFamily: FONT_SANS,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: scopeFilter === 'my' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 150ms'
                }}
              >
                📥 My Queue ({myAssigned.length})
              </button>
              <button
                onClick={() => setScopeFilter('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: scopeFilter === 'all' ? '#ffffff' : 'transparent',
                  color: scopeFilter === 'all' ? '#0f172a' : '#475569',
                  fontWeight: 600,
                  fontSize: '14px',
                  fontFamily: FONT_SANS,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: scopeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 150ms'
                }}
              >
                🌐 All Ward Issues ({complaints.length})
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Assigned', value: myAssigned.length, color: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD' },
            { label: 'Pending Response', value: pendingCount, color: '#4F46E5', bg: '#EEF2F6', border: '#E2E8F0' },
            { label: 'In Progress', value: inProgressCount, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            { label: 'Overdue SLA', value: overdueCount, color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
            { label: 'Resolved Today', value: resolvedTodayCount, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: `1px solid ${stat.border}`,
              padding: '16px 20px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '32px', color: stat.color, lineHeight: 1, marginBottom: '6px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '14px', fontFamily: FONT_SANS, color: '#475569', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search, Filter & Sort Panel */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Search</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 12px 0 34px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '14px',
                  fontFamily: FONT_SANS,
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 150ms'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Status</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                minWidth: '130px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              {Object.keys(STATUS_META).map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Priority</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                minWidth: '120px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Priorities</option>
              {Object.keys(PRIORITY_META).map(p => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Category</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                minWidth: '150px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{CAT_LABEL[c] ?? c}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Ward / Location</span>
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                minWidth: '150px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Locations</option>
              {uniqueWards.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Sort By controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>Sort By</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="urgent">Highest Priority</option>
              <option value="overdue">SLA Overdue</option>
            </select>
          </div>

          {/* Overdue Checkbox */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            fontWeight: 600, 
            color: '#1e293b', 
            fontFamily: FONT_SANS,
            height: '36px'
          }}>
            <input
              type="checkbox"
              checked={overdueFilter}
              onChange={e => setOverdueFilter(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={16} style={{ color: '#dc2626' }} /> Overdue SLA Only
            </span>
          </label>

          {/* Clear filters button */}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || overdueFilter) && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setPriorityFilter('all')
                setCategoryFilter('all')
                setLocationFilter('all')
                setOverdueFilter(false)
              }}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px dashed #ef4444',
                color: '#ef4444',
                background: 'transparent',
                fontSize: '14px',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Desktop Table View */}
        {sorted.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '64px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#94a3b8', marginBottom: '16px' }}>
              <FolderOpen size={48} />
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '24px', color: '#0f172a', marginBottom: '8px' }}>
              No complaints in queue
            </h3>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#475569', fontWeight: 400 }}>
              There are no assigned grievances matching your search or filters.
            </p>
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', fontFamily: FONT_SANS }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 20px' }}>Complaint ID</th>
                  <th style={{ padding: '16px 20px' }}>Title</th>
                  <th style={{ padding: '16px 20px' }}>Category</th>
                  <th style={{ padding: '16px 20px' }}>Location</th>
                  <th style={{ padding: '16px 20px' }}>Priority</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Submitted</th>
                  <th style={{ padding: '16px 20px' }}>SLA / Due</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => {
                  const sm = STATUS_META[c.status] ?? { label: c.status, color: '#636363', bg: '#f7f7f7', icon: HelpCircle }
                  const pm = PRIORITY_META[c.priority] ?? PRIORITY_META.medium
                  const sla = formatSlaIndicator(c.created_at, c.priority, c.status)

                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/officer/complaints/${c.complaint_number}`)}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'background-color 100ms'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      {/* ID */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#024ad8' }}>
                          {c.complaint_number}
                        </code>
                      </td>
                      
                      {/* Title */}
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </td>
                      
                      {/* Category */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', color: '#64748b' }}>
                          {(() => {
                            const IconComp = CAT_ICON[c.category] ?? ClipboardList
                            return <IconComp size={16} />
                          })()}
                        </span>
                        {CAT_LABEL[c.category] ?? c.category}
                      </td>
                      
                      {/* Location */}
                      <td style={{ padding: '16px 20px', color: '#475569', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px', color: '#64748b' }}>
                          <MapPin size={14} />
                        </span>
                        {c.location}
                      </td>
                      
                      {/* Priority */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          color: pm.color,
                          background: pm.bg,
                          textTransform: 'uppercase'
                        }}>
                          {pm.label}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          color: sm.color,
                          background: sm.bg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'uppercase'
                        }}>
                          <sm.icon size={14} /> {sm.label}
                        </span>
                      </td>
                      
                      {/* Submitted Time */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      
                      {/* SLA Indicator */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          color: sla.color,
                          background: sla.bg,
                          border: sla.isOverdue ? '1px solid #fca5a5' : 'none'
                        }}>
                          {sla.text}
                        </span>
                      </td>
                      
                      {/* Action */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 120ms'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#024ad8'
                            e.currentTarget.style.color = '#024ad8'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1'
                            e.currentTarget.style.color = '#475569'
                          }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Status Update Modal */}
        {selectedComplaint && (
          <StatusUpdateModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedComplaint(null)
            }}
            complaintId={selectedComplaint.id}
            complaintNumber={selectedComplaint.complaint_number}
            currentStatus={selectedComplaint.status}
            existingNotes={selectedComplaint.notes ? (() => {
              try {
                return JSON.parse(selectedComplaint.notes)
              } catch (e) {
                return []
              }
            })() : []}
            onSuccess={() => {
              setIsModalOpen(false)
              setSelectedComplaint(null)
            }}
          />
        )}
      </div>
    </main>
  )
}
