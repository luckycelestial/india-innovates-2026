'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusUpdateModal from '@/components/officer/status-update-modal'
import { 
  FileText, Inbox, Settings, CheckCircle2, Lock, AlertTriangle, HelpCircle,
  Route, Droplet, Zap, Trash2, Lightbulb, Waves, Trees, Volume2, ClipboardList,
  MapPin, Store, Calendar, User, Clock, Copy, Check, Paperclip, Camera, 
  MessageSquare, Globe, Save, ChevronRight, Activity
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Note = {
  id: string
  text: string
  type: 'internal' | 'public'
  author: string
  created_at: string
}

type Complaint = {
  id: string
  complaint_number: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  location: string
  landmark: string | null
  department: string | null
  is_anonymous: boolean
  created_at: string
  updated_at: string
  notes: string | null // JSON string of Note[]
  assigned_to: string | null
  attachment_urls: string[] | null
}

const STATUS_ORDER = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  submitted:   { label: 'Submitted',   icon: FileText, color: '#1a2a5e', bg: '#e8edf7' },
  assigned:    { label: 'Assigned',    icon: Inbox, color: '#024ad8', bg: '#e8f0fe' },
  in_progress: { label: 'In Progress', icon: Settings, color: '#b45309', bg: '#fef3c7' },
  resolved:    { label: 'Resolved',    icon: CheckCircle2, color: '#166534', bg: '#dcfce7' },
  closed:      { label: 'Closed',      icon: Lock, color: '#636363', bg: '#f7f7f7' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#636363', bg: '#f7f7f7' },
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, icon: HelpCircle, color: '#636363', bg: '#f7f7f7' }
  return (
    <span style={{ 
      padding: '4px 12px', 
      borderRadius: 'var(--rounded-pill)', 
      fontSize: '12px', 
      fontWeight: 700, 
      letterSpacing: '0.4px', 
      textTransform: 'uppercase', 
      color: m.color, 
      background: m.bg, 
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <m.icon size={12} /> {m.label}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '2px', color: 'var(--color-steel)' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '14px', color: 'var(--color-ink)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children, style = {} }: { title: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ 
      background: 'var(--color-canvas)', 
      borderRadius: 'var(--rounded-xl)', 
      border: '1px solid var(--color-hairline)', 
      boxShadow: 'var(--shadow-soft-lift)', 
      overflow: 'hidden',
      ...style
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-cloud)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--color-charcoal)', letterSpacing: '0.4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

export default function OfficerComplaintDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  // Edit fields
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [department, setDepartment] = useState('')
  
  // Notes state
  const [notesList, setNotesList] = useState<Note[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteType, setNewNoteType] = useState<'internal' | 'public'>('internal')

  const OFFICER_NAME = 'Priya Nair'

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('complaint_number', decodeURIComponent(id))
        .single()

      if (!error && data) {
        setComplaint(data)
        setStatus(data.status)
        setPriority(data.priority)
        setDepartment(data.department ?? '')
        
        // Load notes list
        try {
          if (data.notes) {
            const parsed = JSON.parse(data.notes)
            if (Array.isArray(parsed)) {
              setNotesList(parsed)
            }
          }
        } catch (e) {
          console.error('Notes JSON parsing failed', e)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const copyId = () => {
    navigator.clipboard.writeText(complaint?.complaint_number ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim()) return

    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      text: newNoteText,
      type: newNoteType,
      author: OFFICER_NAME,
      created_at: new Date().toISOString()
    }

    setNotesList(prev => [newNote, ...prev])
    setNewNoteText('')
  }

  const handleSaveUpdates = async () => {
    if (!complaint) return
    setSaving(true)
    setSaveSuccess(false)

    const updatedNotes = JSON.stringify(notesList)

    const { error } = await supabase
      .from('complaints')
      .update({
        status,
        priority,
        department: department || null,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', complaint.id)

    setSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      // Update local complaint state
      setComplaint(prev => prev ? {
        ...prev,
        status,
        priority,
        department: department || null,
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      } : null)
    } else {
      alert('Error updating complaint: ' + error.message)
    }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--color-charcoal)' }}>Loading complaint workspace…</div>
    </main>
  )

  if (!complaint) return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>🔍</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--color-ink)' }}>Complaint not found</h2>
      <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>Complaint ID <code style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{decodeURIComponent(id)}</code> does not exist.</p>
      <Link href="/officer/dashboard" style={{ padding: '10px 20px', borderRadius: 'var(--rounded-md)', background: '#0EA5E9', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Back to Dashboard</Link>
    </main>
  )

  const priorityMeta = PRIORITY_CONFIG[complaint.priority] ?? PRIORITY_CONFIG.medium

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {/* Save success banner */}
        {saveSuccess && (
          <div style={{ 
            background: '#D1FAE5', 
            border: '1px solid #34D399', 
            color: '#065F46', 
            padding: '12px 20px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            fontSize: '14px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <CheckCircle2 size={16} /> Complaint updates saved successfully and propagated to citizen feed.
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#024ad8' }}>{complaint.complaint_number}</code>
            <button onClick={copyId} style={{
              padding: '3px 10px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-steel)',
              background: copied ? '#dcfce7' : 'var(--color-canvas)', color: copied ? '#166534' : 'var(--color-charcoal)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy ID'}
            </button>
            <StatusChip status={complaint.status} />
            <span style={{ 
              padding: '3px 10px', 
              borderRadius: 'var(--rounded-pill)', 
              fontSize: '11px', 
              fontWeight: 700, 
              color: priorityMeta.color, 
              background: priorityMeta.bg, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px' 
            }}>
              {priorityMeta.label} Priority
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '30px', lineHeight: 1.15, color: 'var(--color-ink)' }}>
            {complaint.title}
          </h1>
        </div>

        {/* Workspace Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Complaint details, notes log, attachments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Core details card */}
            <Card title={<><ClipboardList size={16} /> Complaint Overview</>}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InfoRow icon={(() => { const IconComp = CAT_ICON[complaint.category] ?? ClipboardList; return <IconComp size={16} /> })()} label="Category" value={CAT_LABEL[complaint.category] ?? complaint.category} />
                <InfoRow icon={<MapPin size={16} />} label="Ward / Location" value={complaint.location} />
                {complaint.landmark && <InfoRow icon={<Store size={16} />} label="Landmark Reference" value={complaint.landmark} />}
                <InfoRow icon={<Calendar size={16} />} label="Filing Date" value={formatDate(complaint.created_at)} />
                <InfoRow icon={<User size={16} />} label="Submission Mode" value={complaint.is_anonymous ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Anonymous Citizen</span> : 'Public Named Citizen'} />
                <InfoRow icon={<Clock size={16} />} label="Last Updated" value={formatDate(complaint.updated_at)} />
              </div>
            </Card>

            {/* Description card */}
            <Card title={<><FileText size={16} /> Citizen Description</>}>
              <p style={{ fontSize: '15px', color: 'var(--color-ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {complaint.description}
              </p>
            </Card>

            {/* Attachments panel */}
            <Card title={<><Paperclip size={16} /> Attachments / Evidence</>}>
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-cloud)', borderRadius: 'var(--rounded-lg)', border: '1px dashed var(--color-steel)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: '#64748b', marginBottom: '8px' }}>
                  <Camera size={28} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)' }}>
                  {complaint.attachment_urls && complaint.attachment_urls.length > 0 
                    ? `${complaint.attachment_urls.length} file(s) attached` 
                    : 'No photo evidence uploaded by citizen'}
                </p>
              </div>
            </Card>

            {/* Internal Notes & Public Updates log */}
            <Card title={<><MessageSquare size={16} /> Activity & Updates Log</>}>
              <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Type a new update message or internal note..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-steel)',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-charcoal)', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="note_type"
                          checked={newNoteType === 'internal'}
                          onChange={() => setNewNoteType('internal')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Internal Note</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-charcoal)', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="note_type"
                          checked={newNoteType === 'public'}
                          onChange={() => setNewNoteType('public')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> Public Citizen Update</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 14px',
                        background: 'var(--color-ink)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Note
                    </button>
                  </div>
                </div>
              </form>

              {/* Notes list display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notesList.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-steel)', textAlign: 'center', padding: '12px 0' }}>
                    No notes recorded yet. Add notes to track operational progress.
                  </p>
                ) : (
                  notesList.map(note => {
                    const isInternal = note.type === 'internal'
                    return (
                      <div
                        key={note.id}
                        style={{
                          background: isInternal ? 'rgba(15,23,42,0.03)' : 'rgba(5,150,105,0.03)',
                          border: isInternal ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(5,150,105,0.08)',
                          borderRadius: '8px',
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)' }}>
                            {note.author} ({isInternal ? '🔒 Officer Note' : '📢 Public Update'})
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-graphite)' }}>
                            {new Date(note.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Interactive controls & Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '72px' }}>
            
            {/* Operational Actions */}
            <Card title={<><Settings size={16} /> Resolve & Manage</>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Status Trigger */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Complaint Status
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-cloud)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: 'var(--rounded-lg)',
                    padding: '12px 14px'
                  }}>
                    <StatusChip status={status} />
                    <button
                      onClick={() => setIsStatusModalOpen(true)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--color-ink)',
                        color: '#fff',
                        borderRadius: 'var(--rounded-md)',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <Settings size={12} /> Update
                    </button>
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Severity Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-steel)',
                      background: 'var(--color-canvas)',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    {Object.keys(PRIORITY_CONFIG).map(p => (
                      <option key={p} value={p}>
                        {PRIORITY_CONFIG[p]?.label ?? p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Reassignment */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Department Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. PWD, Urban Development"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-steel)',
                      background: 'var(--color-canvas)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Save details */}
                <button
                  onClick={handleSaveUpdates}
                  disabled={saving}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#0EA5E9',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    transition: 'all 150ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {saving ? 'Saving...' : <><Save size={14} /> Save Workspace Updates</>}
                </button>

              </div>
            </Card>

            {/* Simulated Live Timeline (reads from status value) */}
            <Card title={<><Activity size={16} /> Workflow Stepper</>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {STATUS_ORDER.map((stepStatus, i) => {
                  const meta = STATUS_META[stepStatus]
                  const currentIdx = STATUS_ORDER.indexOf(status)
                  const done = i <= currentIdx
                  const active = i === currentIdx
                  
                  return (
                    <div key={stepStatus} style={{ display: 'flex', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          border: done ? `2px solid ${meta.color}` : '1.5px solid var(--color-steel)',
                          background: done ? meta.bg : 'var(--color-cloud)',
                          fontWeight: active ? 800 : 400,
                          zIndex: 1,
                        }}>{done ? <meta.icon size={14} /> : '○'}</div>
                        {i < STATUS_ORDER.length - 1 && (
                          <div style={{ width: '2px', flex: 1, minHeight: '20px', background: done && i < currentIdx ? meta.color : 'var(--color-hairline)', margin: '2px 0' }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < STATUS_ORDER.length - 1 ? '16px' : '0', paddingTop: '2px' }}>
                        <div style={{ fontWeight: active ? 700 : 600, fontSize: '13px', color: done ? meta.color : 'var(--color-steel)' }}>
                          {meta.label}
                          {active && <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: meta.bg, color: meta.color, fontWeight: 700 }}>Active</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {complaint && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          complaintId={complaint.id}
          complaintNumber={complaint.complaint_number}
          currentStatus={status}
          existingNotes={notesList}
          onSuccess={(updatedStatus, updatedNotes) => {
            setStatus(updatedStatus)
            try {
              const parsed = JSON.parse(updatedNotes)
              if (Array.isArray(parsed)) {
                setNotesList(parsed)
              }
            } catch (e) {}
            setComplaint(prev => prev ? {
              ...prev,
              status: updatedStatus,
              notes: updatedNotes,
              updated_at: new Date().toISOString()
            } : null)
          }}
        />
      )}
    </main>
  )
}
