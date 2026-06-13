'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusUpdateModal from '@/components/officer/status-update-modal'
import { 
  Search, AlertCircle, Building2, Clock, MessageSquare, 
  FileText, Inbox, Settings, Eye, CheckCircle2, Lock, AlertTriangle, HelpCircle,
  Route, Droplet, Zap, Trash2, Lightbulb, Waves, Trees, Volume2, ClipboardList
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

const COLUMNS = [
  { id: 'submitted', label: 'Submitted', icon: FileText, color: '#475569', dot: '#64748b' },
  { id: 'assigned', label: 'Assigned', icon: Inbox, color: '#024ad8', dot: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', icon: Settings, color: '#b45309', dot: '#f59e0b' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2, color: '#166534', dot: '#10b981' },
  { id: 'closed', label: 'Closed', icon: Lock, color: '#636363', dot: '#6b7280' },
  { id: 'escalated', label: 'Escalated', icon: AlertTriangle, color: '#dc2626', dot: '#ef4444' }
]

const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function getComplaintColumn(status: string) {
  if (status === 'rejected') return 'closed'
  if (status === 'pending_review') return 'resolved'
  return status
}

function getPriorityWeight(p: string) {
  switch (p) {
    case 'urgent': return 4
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    default: return 0
  }
}

function getComplainantName(c: Complaint) {
  if (c.is_anonymous) return "Anonymous Citizen"
  const num = parseInt(c.complaint_number.split('-').pop() || '0')
  const names = [
    "Ananya Singh", "Rahul Nair", "Tanmay Sen", "Vihaan Bose", 
    "Shreya Joshi", "Kavya Reddy", "Arjun Kumar", "Nikhil Jain",
    "Rohan Patel", "Ishaan Malhotra", "Zara Khan", "Priya Sharma"
  ]
  return names[num % names.length]
}

function getInitialsColor(name: string) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  const colors = [
    { bg: '#fee2e2', text: '#b91c1c' }, // red
    { bg: '#ffedd5', text: '#c2410c' }, // orange
    { bg: '#fef3c7', text: '#b55309' }, // amber
    { bg: '#ecfdf5', text: '#047857' }, // emerald
    { bg: '#e0f2fe', text: '#0369a1' }, // sky
    { bg: '#e0e7ff', text: '#4338ca' }, // indigo
    { bg: '#f5f3ff', text: '#6d28d9' }, // violet
    { bg: '#fce7f3', text: '#be185d' }, // pink
  ]
  
  let hash = 0
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return { initials, color: colors[index] }
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) {
    return "JUST NOW"
  } else if (diffHours < 24) {
    return `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`
  } else {
    return `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`
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

export default function PipelineBoard() {
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
  const [targetModalStatus, setTargetModalStatus] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draggingCard, setDraggingCard] = useState<Complaint | null>(null)

  const handleExportData = () => {
    const headers = ['Complaint ID', 'Title', 'Category', 'Location', 'Priority', 'Status', 'Submitted', 'Department']
    const rows = sorted.map(c => [
      c.complaint_number,
      c.title,
      c.category,
      c.location,
      c.priority,
      c.status,
      c.created_at,
      c.department || ''
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
      
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `praja_pipeline_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, card: Complaint) => {
    setDraggingCard(card)
    e.dataTransfer.setData('text/plain', card.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingCard(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!draggingCard) return

    const originalStatus = draggingCard.status
    if (originalStatus === targetStatus) return

    if (['in_progress', 'resolved', 'rejected', 'escalated'].includes(targetStatus)) {
      setSelectedComplaint(draggingCard)
      setTargetModalStatus(targetStatus)
      setIsModalOpen(true)
    } else {
      try {
        const timestamp = new Date().toISOString()
        const { error } = await supabase
          .from('complaints')
          .update({
            status: targetStatus,
            updated_at: timestamp
          })
          .eq('id', draggingCard.id)

        if (error) throw error
      } catch (err) {
        alert('Failed to update status')
      }
    }
  }

  const handleModalSuccess = (updatedStatus: string, updatedNotes: string) => {
    setIsModalOpen(false)
    setSelectedComplaint(null)
  }

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

      const channelName = `pipeline_dashboard_changes_${Math.random().toString(36).substring(2, 9)}`
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

  const myAssigned = complaints.filter(c => c.assigned_to === officerId)
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
              Complaint Pipeline Tracker
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#475569', marginTop: '8px', lineHeight: 1.6, fontWeight: 400 }}>
              Manage pipeline stages and track resolution progress.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportData}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: FONT_SANS,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                transition: 'all 150ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
              onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Data
            </button>
            
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

          {/* Sort controls */}
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

        {/* Kanban Board View */}
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '20px',
          alignItems: 'stretch',
          minHeight: '650px',
        }}>
          {COLUMNS.map(col => {
            const colComplaints = sorted.filter(c => getComplaintColumn(c.status) === col.id)

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{
                  width: '300px',
                  minWidth: '300px',
                  flexShrink: 0,
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 240px)',
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#ffffff',
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    fontFamily: FONT_SANS,
                    letterSpacing: '0.75px',
                    color: '#475569',
                    textTransform: 'uppercase'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: col.dot || col.color,
                      display: 'inline-block'
                    }} />
                    {col.label}
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    fontSize: '14px',
                    fontFamily: FONT_SANS,
                    fontWeight: 600,
                    color: '#475569',
                  }}>
                    {colComplaints.length}
                  </span>
                </div>

                {/* Column Cards Area */}
                <div style={{
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: '150px',
                }}>
                  {colComplaints.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '36px 10px',
                      color: '#94a3b8',
                      fontSize: '14px',
                      fontFamily: FONT_SANS,
                      border: '2px dashed #e2e8f0',
                      borderRadius: '12px',
                      background: '#ffffff'
                    }}>
                      Drag here
                    </div>
                  ) : (
                    colComplaints.map(c => {
                      const sm = STATUS_META[c.status] ?? { label: c.status, color: '#636363', bg: '#f7f7f7', icon: '❓' }
                      const pm = PRIORITY_META[c.priority] ?? PRIORITY_META.medium
                      const sla = formatSlaIndicator(c.created_at, c.priority, c.status)
                      const complainantName = getComplainantName(c)
                      const avatar = getInitialsColor(complainantName)

                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/officer/complaints/${c.complaint_number}`)}
                          style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                            cursor: 'grab',
                            userSelect: 'none',
                            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            position: 'relative'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            e.currentTarget.style.borderColor = '#cbd5e1'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
                            e.currentTarget.style.borderColor = '#e2e8f0'
                          }}
                        >
                          {/* Header: Avatar, Name, Checkbox */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Avatar */}
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: avatar.color.bg,
                              color: avatar.color.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              {avatar.initials}
                            </div>
                            
                            {/* Complainant name and ID */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: '14px',
                                fontFamily: FONT_SANS,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: '1.2'
                              }}>
                                {complainantName}
                              </div>
                              <div style={{
                                fontSize: '10px',
                                color: '#64748b',
                                fontFamily: 'monospace',
                                marginTop: '2px'
                              }}>
                                {c.complaint_number}
                              </div>
                            </div>

                            {/* Mock Checkbox */}
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              flexShrink: 0,
                              cursor: 'pointer'
                            }} />
                          </div>

                          {/* Complaint Title */}
                          <div style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            fontFamily: FONT_DISPLAY,
                            color: '#1e293b',
                            lineHeight: '1.3',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            margin: '4px 0'
                          }}>
                            {c.title}
                          </div>

                          {/* Department & Category */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: FONT_SANS, color: '#475569' }}>
                            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#64748b' }}>
                              <Building2 size={14} />
                            </span>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 500
                            }}>
                              {c.department || 'Unassigned'} · {CAT_LABEL[c.category] ?? c.category}
                            </span>
                          </div>

                          {/* Badge row: Priority / Status */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '10px',
                              fontFamily: FONT_SANS,
                              fontWeight: 700,
                              padding: '3px 6px',
                              borderRadius: '4px',
                              color: pm.color,
                              background: pm.bg,
                              letterSpacing: '0.25px'
                            }}>
                              PRIORITY: {pm.label.toUpperCase()}
                            </span>
                            
                            {c.status !== col.id && (
                              <span style={{
                                fontSize: '10px',
                                fontFamily: FONT_SANS,
                                fontWeight: 700,
                                padding: '3px 6px',
                                borderRadius: '4px',
                                color: sm.color,
                                background: sm.bg,
                                letterSpacing: '0.25px'
                              }}>
                                STATE: {sm.label.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Footer: Date and Icons */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontFamily: FONT_SANS,
                            color: '#64748b',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '10px',
                            marginTop: '2px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} style={{ color: '#64748b' }} />
                              <span style={{ fontWeight: 500 }}>{getRelativeTime(c.created_at)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                <MessageSquare size={13} />
                              </span>
                              <span style={{ cursor: 'grab', fontSize: '12px', color: '#94a3b8' }}>::</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

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
            initialTargetStatus={targetModalStatus}
            onSuccess={handleModalSuccess}
          />
        )}
      </div>
    </main>
  )
}
