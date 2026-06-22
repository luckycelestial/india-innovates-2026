'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/db/client'
import StatusUpdateModal from '@/components/officer/status-update-modal'
import { 
  FileText, Inbox, Settings, CheckCircle2, Lock, AlertTriangle, HelpCircle,
  Route, Droplet, Zap, Trash2, Lightbulb, Waves, Trees, Volume2, ClipboardList,
  MapPin, Store, Calendar, User, Clock, Copy, Check, Paperclip, Camera, 
  MessageSquare, Globe, Save, Activity, X
} from 'lucide-react'

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
  description: string | null
  category: string
  status: string
  priority: string
  location: string
  landmark: string | null
  department: string | null
  is_anonymous?: boolean
  created_at: string
  updated_at: string
  notes: string | null
  assigned_to: string | null
}

type ComplaintDetailsDrawerProps = {
  complaint: Complaint
  onClose: () => void
  onUpdate: (updated: Complaint) => void
  STATUS_META: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bg: string }>
  PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }>
  CAT_ICON: Record<string, React.ComponentType<any>>
  CAT_LABEL: Record<string, string>
}

const STATUS_ORDER = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '2px', color: '#64748b' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ 
      background: '#ffffff', 
      borderRadius: '12px', 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
      overflow: 'hidden',
      marginBottom: '16px'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '12px', color: '#334155', letterSpacing: '0.4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  )
}

export default function ComplaintDetailsDrawer({
  complaint,
  onClose,
  onUpdate,
  STATUS_META,
  PRIORITY_CONFIG,
  CAT_ICON,
  CAT_LABEL
}: ComplaintDetailsDrawerProps) {
  const db = createClient()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  // Edit fields
  const [status, setStatus] = useState(complaint.status)
  const [priority, setPriority] = useState(complaint.priority)
  const [department, setDepartment] = useState(complaint.department ?? '')
  
  // Notes state
  const [notesList, setNotesList] = useState<Note[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteType, setNewNoteType] = useState<'internal' | 'public'>('internal')

  const OFFICER_NAME = 'Priya Nair'

  useEffect(() => {
    setStatus(complaint.status)
    setPriority(complaint.priority)
    setDepartment(complaint.department ?? '')
    
    try {
      if (complaint.notes) {
        const parsed = JSON.parse(complaint.notes)
        if (Array.isArray(parsed)) {
          setNotesList(parsed)
        }
      } else {
        setNotesList([])
      }
    } catch (e) {
      console.error('Notes JSON parsing failed', e)
      setNotesList([])
    }
  }, [complaint])

  const copyId = () => {
    navigator.clipboard.writeText(complaint.complaint_number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim()) return

    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      text: newNoteText,
      type: newNoteType,
      author: OFFICER_NAME,
      created_at: new Date().toISOString()
    }

    const updatedNotesList = [newNote, ...notesList]
    setNotesList(updatedNotesList)
    setNewNoteText('')

    const updatedNotesJson = JSON.stringify(updatedNotesList)
    const { error } = await db
      .from('complaints')
      .update({
        notes: updatedNotesJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', complaint.id)

    if (!error) {
      onUpdate({
        ...complaint,
        notes: updatedNotesJson,
        updated_at: new Date().toISOString()
      })
    } else {
      alert('Error saving note: ' + error.message)
    }
  }

  const handleSaveUpdates = async () => {
    setSaving(true)
    setSaveSuccess(false)

    const updatedNotesJson = JSON.stringify(notesList)
    const { error } = await db
      .from('complaints')
      .update({
        status,
        priority,
        department: department || null,
        notes: updatedNotesJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', complaint.id)

    setSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      onUpdate({
        ...complaint,
        status,
        priority,
        department: department || null,
        notes: updatedNotesJson,
        updated_at: new Date().toISOString()
      })
    } else {
      alert('Error updating complaint: ' + error.message)
    }
  }

  const priorityMeta = PRIORITY_CONFIG[status === 'rejected' ? 'low' : priority] ?? PRIORITY_CONFIG.medium
  const statusMeta = STATUS_META[status] ?? { label: status, icon: HelpCircle, color: '#636363', bg: '#f7f7f7' }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Drawer slide-out panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '560px',
        maxWidth: '100vw',
        background: '#f8fafc',
        boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_SANS,
        animation: 'slideIn 0.2s ease-out'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#024ad8' }}>{complaint.complaint_number}</code>
              <button onClick={copyId} style={{
                padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: copied ? '#dcfce7' : '#ffffff', color: copied ? '#166534' : '#475569',
                fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms',
                display: 'inline-flex', alignItems: 'center', gap: '4px', outline: 'none'
              }}>
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <span style={{ 
                padding: '2px 10px', 
                borderRadius: '20px', 
                fontSize: '11px', 
                fontWeight: 700, 
                color: statusMeta.color, 
                background: statusMeta.bg, 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textTransform: 'uppercase'
              }}>
                <statusMeta.icon size={11} /> {statusMeta.label}
              </span>
              <span style={{ 
                padding: '2px 10px', 
                borderRadius: '20px', 
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
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', lineHeight: 1.25, color: '#0f172a', margin: 0 }}>
              {complaint.title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {saveSuccess && (
            <div style={{ 
              background: '#d1fae5', 
              border: '1px solid #34d399', 
              color: '#065f46', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '16px', 
              fontSize: '13px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> Complaint updates saved successfully.
            </div>
          )}

          {/* Overview */}
          <Card title={<><ClipboardList size={14} /> Complaint Overview</>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <InfoRow icon={(() => { const IconComp = CAT_ICON[complaint.category] ?? ClipboardList; return <IconComp size={16} /> })()} label="Category" value={CAT_LABEL[complaint.category] ?? complaint.category} />
              <InfoRow icon={<MapPin size={16} />} label="Ward / Location" value={complaint.location} />
              {complaint.landmark && <InfoRow icon={<Store size={16} />} label="Landmark Reference" value={complaint.landmark} />}
              <InfoRow icon={<Calendar size={16} />} label="Filing Date" value={new Date(complaint.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              <InfoRow icon={<User size={16} />} label="Submission Mode" value={complaint.is_anonymous ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Anonymous Citizen</span> : 'Public Named Citizen'} />
              <InfoRow icon={<Clock size={16} />} label="Last Updated" value={new Date(complaint.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            </div>
          </Card>

          {/* Description */}
          <Card title={<><FileText size={14} /> Citizen Description</>}>
            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {complaint.description || 'No description provided.'}
            </p>
          </Card>

          {/* Reassign and Severity controls */}
          <Card title={<><Settings size={14} /> Resolve &amp; Manage</>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Complaint Status
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}>
                  <span style={{ 
                    padding: '3px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: statusMeta.color, 
                    background: statusMeta.bg, 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase'
                  }}>
                    <statusMeta.icon size={11} /> {statusMeta.label}
                  </span>
                  <button
                    onClick={() => setIsStatusModalOpen(true)}
                    style={{
                      padding: '6px 12px',
                      background: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Settings size={12} /> Update Status
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Severity Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {Object.keys(PRIORITY_CONFIG).map(p => (
                    <option key={p} value={p}>
                      {PRIORITY_CONFIG[p]?.label ?? p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Department Unit
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. PWD, Health Department"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={handleSaveUpdates}
                disabled={saving}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0ea5e9',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(14, 165, 233, 0.15)'
                }}
              >
                {saving ? 'Saving...' : <><Save size={14} /> Save Details</>}
              </button>
            </div>
          </Card>

          {/* Workflow Stepper */}
          <Card title={<><Activity size={14} /> Workflow Stepper</>}>
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
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        border: done ? `2px solid ${meta.color}` : '1.5px solid #cbd5e1',
                        background: done ? meta.bg : '#f8fafc',
                        color: done ? meta.color : '#cbd5e1',
                        zIndex: 1,
                      }}>{done ? <meta.icon size={12} /> : '○'}</div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div style={{ width: '2px', flex: 1, minHeight: '16px', background: done && i < currentIdx ? meta.color : '#e2e8f0', margin: '2px 0' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < STATUS_ORDER.length - 1 ? '12px' : '0', paddingTop: '2px' }}>
                      <div style={{ fontWeight: active ? 700 : 600, fontSize: '13px', color: done ? meta.color : '#64748b' }}>
                        {meta.label}
                        {active && <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: meta.bg, color: meta.color, fontWeight: 700 }}>Active</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Activity Logs */}
          <Card title={<><MessageSquare size={14} /> Activity &amp; Updates Log</>}>
            <form onSubmit={handleAddNote} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Type a new update message or internal note..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="note_type"
                        checked={newNoteType === 'internal'}
                        onChange={() => setNewNoteType('internal')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Internal</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="note_type"
                        checked={newNoteType === 'public'}
                        onChange={() => setNewNoteType('public')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> Public</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '5px 12px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Note
                  </button>
                </div>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notesList.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                  No updates recorded yet.
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
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                          {note.author} ({isInternal ? '🔒 Officer Note' : '📢 Public Update'})
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {new Date(note.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {note.text}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>
      </div>

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
            onUpdate({
              ...complaint,
              status: updatedStatus,
              notes: updatedNotes,
              updated_at: new Date().toISOString()
            })
          }}
        />
      )}

      {/* Slide-in Animations styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </>
  )
}
