'use client'

import { useState } from 'react'
import { 
  Building2, Clock, MessageSquare, FileText, Inbox, Settings, Eye, 
  CheckCircle2, Lock, AlertTriangle, Route, Droplet, Zap, Trash2, 
  Lightbulb, Waves, Trees, Volume2, ClipboardList
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

type KanbanBoardProps = {
  complaints: Complaint[]
  onCardClick: (c: Complaint) => void
  onCardDrop: (card: Complaint, targetStatus: string) => void
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
    { bg: '#fee2e2', text: '#b91c1c' },
    { bg: '#ffedd5', text: '#c2410c' },
    { bg: '#fef3c7', text: '#b55309' },
    { bg: '#ecfdf5', text: '#047857' },
    { bg: '#e0f2fe', text: '#0369a1' },
    { bg: '#e0e7ff', text: '#4338ca' },
    { bg: '#f5f3ff', text: '#6d28d9' },
    { bg: '#fce7f3', text: '#be185d' },
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

export default function KanbanBoard({ complaints, onCardClick, onCardDrop }: KanbanBoardProps) {
  const [draggingCard, setDraggingCard] = useState<Complaint | null>(null)

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

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!draggingCard) return

    const originalStatus = draggingCard.status
    if (originalStatus === targetStatus) return

    onCardDrop(draggingCard, targetStatus)
  }

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      overflowX: 'auto',
      paddingBottom: '20px',
      alignItems: 'stretch',
      minHeight: '650px',
    }}>
      {COLUMNS.map(col => {
        const colComplaints = complaints.filter(c => getComplaintColumn(c.status) === col.id)

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              width: '360px',
              minWidth: '360px',
              flexShrink: 0,
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 170px)',
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
                      onClick={() => onCardClick(c)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        cursor: 'grab',
                        userSelect: 'none',
                        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
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
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: avatar.color.bg,
                          color: avatar.color.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {avatar.initials}
                        </div>
                        
                        {/* Complainant name and ID */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '13px',
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
                            marginTop: '0px'
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
                        fontSize: '14px',
                        fontFamily: FONT_DISPLAY,
                        color: '#1e293b',
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        margin: '2px 0'
                      }}>
                        {c.title}
                      </div>

                      {/* Department & Category */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: FONT_SANS, color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#64748b' }}>
                          <Building2 size={12} />
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
                          fontSize: '9.5px',
                          fontFamily: FONT_SANS,
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          color: pm.color,
                          background: pm.bg,
                          letterSpacing: '0.25px'
                        }}>
                          PRIORITY: {pm.label.toUpperCase()}
                        </span>
                        
                        {c.status !== col.id && (
                          <span style={{
                            fontSize: '9.5px',
                            fontFamily: FONT_SANS,
                            fontWeight: 700,
                            padding: '2px 5px',
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
                        paddingTop: '6px',
                        marginTop: '0px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} style={{ color: '#64748b' }} />
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
  )
}
