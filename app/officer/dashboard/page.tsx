'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import FilterStrip from '@/components/officer/pipeline/FilterStrip'
import KanbanBoard from '@/components/officer/pipeline/KanbanBoard'
import ComplaintDetailsDrawer from '@/components/officer/pipeline/ComplaintDetailsDrawer'
import StatusUpdateModal from '@/components/officer/status-update-modal'
import { 
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
  landmark: string | null
  created_at: string
  updated_at: string
  assigned_to: string | null
  notes: string | null
  is_anonymous?: boolean
  department: string | null
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

function OfficerDashboardContent() {
  const db = createClient()

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

  // Drawer & Modal States
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [targetModalStatus, setTargetModalStatus] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const OFFICER_ID = '5af1a48c-e56a-4886-8379-110b99feb069'

  const searchParams = useSearchParams()
  const complaintParam = searchParams ? searchParams.get('complaint') : null

  useEffect(() => {
    if (complaintParam && complaints.length > 0) {
      const match = complaints.find(c => c.complaint_number === complaintParam)
      if (match) {
        setSelectedComplaint(match)
      }
    }
  }, [complaintParam, complaints])

  useEffect(() => {
    let active = true
    let channel: any = null

    const load = async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!active) return
      const currentId = user?.id ?? OFFICER_ID
      setOfficerId(currentId)

      const fetchComplaints = async () => {
        const { data, error } = await db
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false })

        if (active && !error && data) {
          setComplaints(data)
        }
      }

      await fetchComplaints()
      if (active) setLoading(false)

      const channelName = `officer_dashboard_pipeline_${Math.random().toString(36).substring(2, 9)}`
      channel = db
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
        db.removeChannel(channel)
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
    link.setAttribute("download", `nagaragupta_pipeline_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCardDrop = async (card: Complaint, targetStatus: string) => {
    if (['in_progress', 'resolved', 'rejected', 'escalated'].includes(targetStatus)) {
      setSelectedComplaint(card)
      setTargetModalStatus(targetStatus)
      setIsModalOpen(true)
    } else {
      try {
        const timestamp = new Date().toISOString()
        const updatedCard = { ...card, status: targetStatus, updated_at: timestamp }
        setComplaints(prev => prev.map(c => c.id === card.id ? updatedCard : c))

        const { error } = await db
          .from('complaints')
          .update({
            status: targetStatus,
            updated_at: timestamp
          })
          .eq('id', card.id)

        if (error) throw error
      } catch (err) {
        alert('Failed to update status')
        // reload
        const { data } = await db.from('complaints').select('*').order('created_at', { ascending: false })
        if (data) setComplaints(data)
      }
    }
  }

  const handleModalSuccess = (updatedStatus: string, updatedNotes: string) => {
    if (selectedComplaint) {
      const updatedCard = {
        ...selectedComplaint,
        status: updatedStatus,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      }
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? updatedCard : c))
    }
    setIsModalOpen(false)
    setSelectedComplaint(null)
    setTargetModalStatus(undefined)
  }

  const handleComplaintUpdate = (updated: Complaint) => {
    setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c))
    if (selectedComplaint && selectedComplaint.id === updated.id) {
      setSelectedComplaint(updated)
    }
  }

  const myAssigned = complaints.filter(c => c.assigned_to === officerId)
  const uniqueWards = Array.from(new Set(complaints.map(c => c.location).filter(Boolean)))
  const uniqueCategories = Array.from(new Set(complaints.map(c => c.category).filter(Boolean)))

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
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
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 24px 12px 24px', fontFamily: FONT_SANS }}>
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
        
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

        {/* Filter Strip */}
        <FilterStrip
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          overdueFilter={overdueFilter}
          setOverdueFilter={setOverdueFilter}
          uniqueCategories={uniqueCategories}
          uniqueWards={uniqueWards}
          STATUS_META={STATUS_META}
          PRIORITY_META={PRIORITY_META}
          CAT_LABEL={CAT_LABEL}
        />

        {/* Kanban Board */}
        <KanbanBoard
          complaints={sorted}
          onCardClick={(c) => setSelectedComplaint(c)}
          onCardDrop={handleCardDrop}
        />

        {/* Complaint Details Drawer */}
        {selectedComplaint && !isModalOpen && (
          <ComplaintDetailsDrawer
            complaint={selectedComplaint}
            onClose={() => setSelectedComplaint(null)}
            onUpdate={handleComplaintUpdate}
            STATUS_META={STATUS_META}
            PRIORITY_CONFIG={PRIORITY_META}
            CAT_ICON={CAT_ICON}
            CAT_LABEL={CAT_LABEL}
          />
        )}

        {/* Status Update Modal */}
        {selectedComplaint && isModalOpen && (
          <StatusUpdateModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedComplaint(null)
              setTargetModalStatus(undefined)
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

export default function OfficerDashboard() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 24px 12px 24px', fontFamily: FONT_SANS }}>
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    }>
      <OfficerDashboardContent />
    </Suspense>
  )
}
