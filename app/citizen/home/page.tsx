'use client'

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  MapPin, Image as ImageIcon, CheckCircle, Clock, AlertTriangle, Send, 
  ClipboardList, FilePlus, Search, HelpCircle, ArrowLeft, RefreshCw, X, Check, Copy
} from 'lucide-react'
import { createClient } from '@/lib/db/client'

// ─── Config & Constants ──────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'road', label: '🛣️ Road & Pavement' },
  { value: 'water', label: '💧 Water Supply' },
  { value: 'electricity', label: '⚡ Electricity' },
  { value: 'sanitation', label: '🧹 Sanitation & Cleanliness' },
  { value: 'streetlight', label: '💡 Street Lighting' },
  { value: 'drainage', label: '🌊 Drainage & Waterlogging' },
  { value: 'waste', label: '🗑️ Solid Waste Management' },
  { value: 'parks', label: '🌳 Parks & Public Spaces' },
  { value: 'noise', label: '🔊 Noise Pollution' },
  { value: 'other', label: '📋 Other' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', desc: 'No immediate impact', color: '#636363', bg: '#f7f7f7' },
  { value: 'medium', label: 'Medium', desc: 'Needs attention', color: '#024ad8', bg: '#e8f0fe' },
  { value: 'high', label: 'High', desc: 'Causing disruption', color: '#b45309', bg: '#fef3c7' },
  { value: 'urgent', label: 'Urgent', desc: 'Health or safety risk', color: '#b3262b', bg: '#fee2e2' },
]

const STATUS_ORDER = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']

const STATUS_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  submitted:   { label: 'Submitted',   icon: '📝', color: '#1a2a5e', bg: '#e8edf7' },
  assigned:    { label: 'Assigned',    icon: '📬', color: '#024ad8', bg: '#e8f0fe' },
  in_progress: { label: 'In Progress', icon: '⚙️', color: '#b45309', bg: '#fef3c7' },
  resolved:    { label: 'Resolved',    icon: '✅', color: '#166534', bg: '#dcfce7' },
  closed:      { label: 'Closed',      icon: '🔒', color: '#636363', bg: '#f7f7f7' },
  escalated:   { label: 'Escalated',   icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
}

const CAT_ICON: Record<string, string> = {
  road: '🛣️', water: '💧', electricity: '⚡', sanitation: '🧹',
  streetlight: '💡', drainage: '🌊', waste: '🗑️', parks: '🌳', noise: '🔊', other: '📋',
}

const CAT_LABEL: Record<string, string> = {
  road: 'Road & Pavement', water: 'Water Supply', electricity: 'Electricity',
  sanitation: 'Sanitation & Cleanliness', streetlight: 'Street Lighting',
  drainage: 'Drainage & Waterlogging', waste: 'Solid Waste Management',
  parks: 'Parks & Public Spaces', noise: 'Noise Pollution', other: 'Other',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Reusable Helper Components ────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#262622', marginBottom: '6px' }}>
      {children}
      {required && <span style={{ color: '#b3262b', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{children}</p>
}

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: '11px', color: '#b3262b', marginTop: '4px' }}>⚠ {msg}</p>
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #dadad3', boxShadow: '0 2px 8px rgba(4, 4, 6, 0.02)', overflow: 'hidden', ...style }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #dadad3', background: '#f6f6f3' }}>
        <h3 style={{ fontWeight: 700, fontSize: '12px', color: '#475569', letterSpacing: '0.4px', textTransform: 'uppercase', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #f6f6f3' }}>
      <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function CitizenPortalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = createClient()

  // Form and Tracking sections combined in same page
  
  // Data states
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [complaints, setComplaints] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [filter, setFilter] = useState('all')

  // Search and selection states
  const [searchId, setSearchId] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Form states
  const [form, setForm] = useState({
    title: '', category: '', description: '',
    location: '', landmark: '', priority: 'medium',
    isAnonymous: false, consent: false,
  })
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submissionSuccessData, setSubmissionSuccessData] = useState<any | null>(null)

  // AI analysis states
  const [isPhotoMandatory, setIsPhotoMandatory] = useState(false)
  const [analysisReason, setAnalysisReason] = useState('')
  const [analyzingDescription, setAnalyzingDescription] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      // Get current user
      const { data: { user: u } } = await db.auth.getUser()
      if (u) {
        setUser({ email: u.email, id: u.id })
      }
      await refreshList()
    }
    init()
  }, [])

  // 2. Handle URL parameters for deep linking (?id=COMP-XXXX)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) {
      setSearchId(idParam)
      handleIdLookup(idParam)
      setTimeout(() => {
        document.getElementById('tracking-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    }
  }, [searchParams, complaints])

  // Fetch list from database
  const refreshList = async () => {
    setLoadingList(true)
    try {
      const { data, error } = await db
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setComplaints(data)
        const idParam = searchParams.get('id')
        if (data.length > 0 && !idParam) {
          setSelectedComplaint((prev: any) => prev || data[0])
          setSearchId((prev: any) => prev || data[0].complaint_number)
        }
      }
    } catch (err) {
      console.error('Failed to load complaints:', err)
    } finally {
      setLoadingList(false)
    }
  }

  // AI analysis trigger
  const analyzeDescription = async (text: string) => {
    if (text.trim().length < 5) {
      setIsPhotoMandatory(false)
      setAnalysisReason('')
      return
    }
    setAnalyzingDescription(true)
    try {
      const res = await fetch('/api/analyze-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text })
      })
      if (res.ok) {
        const data = await res.json()
        setIsPhotoMandatory(data.mandatory)
        setAnalysisReason(data.reason)
        if (data.category) {
          setForm(prev => ({ ...prev, category: data.category }))
        }
      }
    } catch (err) {
      console.error('Failed to analyze description:', err)
    } finally {
      setAnalyzingDescription(false)
    }
  }



  const setFormField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [field]: val }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const errs: Partial<Record<string, string>> = {}
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (!form.category) errs.category = 'Category is required.'
    if (!form.description.trim() || form.description.length < 5) {
      errs.description = 'Description must be at least 5 characters.'
    }
    if (!form.location.trim()) errs.location = 'Location details are required.'
    if (isPhotoMandatory && files.length === 0) {
      errs.files = 'A photo is required for validation of this issue.'
    }
    if (!form.consent) errs.consent = 'You must accept the declaration.'
    
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // File drop/upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...newFiles].slice(0, 5))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
      setFiles(prev => [...prev, ...newFiles].slice(0, 5))
    }
  }

  // Submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const { data, error } = await db.from('complaints').insert({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        location: form.location.trim(),
        landmark: form.landmark.trim() || null,
        priority: form.priority,
        is_anonymous: form.isAnonymous,
        submitted_by: form.isAnonymous ? null : (user?.id ?? null),
        department: {
          road: 'Public Works Department',
          water: 'Water Supply Board',
          electricity: 'Electricity Department',
          sanitation: 'Sanitation Department',
          streetlight: 'Street Lighting Division',
          drainage: 'Storm Water Drains Department',
          waste: 'Solid Waste Management',
          parks: 'Parks & Gardens Department',
          noise: 'Pollution Control Board',
          other: 'General Administration',
        }[form.category] ?? 'General Administration'
      }).select().single()

      if (error) throw error

      setSubmissionSuccessData(data)
      setForm({
        title: '', category: '', description: '',
        location: '', landmark: '', priority: 'medium',
        isAnonymous: false, consent: false,
      })
      setFiles([])
      setIsPhotoMandatory(false)
      setAnalysisReason('')
      await refreshList()
    } catch (err) {
      console.error(err)
      alert('Failed to submit complaint. Please check fields.')
    } finally {
      setSubmitting(false)
    }
  }

  // Track / Lookup functions
  const handleIdLookup = async (idVal: string) => {
    const cleanId = idVal.trim().toUpperCase()
    if (!cleanId) return

    setSearchError('')
    // Check locally first
    const localMatch = complaints.find(c => c.complaint_number === cleanId)
    if (localMatch) {
      setSelectedComplaint(localMatch)
      return
    }

    // Otherwise lookup from DB
    try {
      const { data, error } = await db
        .from('complaints')
        .select('*')
        .eq('complaint_number', cleanId)
        .single()

      if (error || !data) {
        setSearchError('Complaint ID not found in database.')
        setSelectedComplaint(null)
      } else {
        setSelectedComplaint(data)
      }
    } catch (err) {
      setSearchError('Error fetching complaint details.')
    }
  }

  const triggerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleIdLookup(searchId)
  }

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredComplaints = useMemo(() => {
    if (filter === 'all') return complaints
    return complaints.filter(c => c.status === filter)
  }, [complaints, filter])

  return (
    <main style={{ minHeight: '100vh', background: '#f6f6f3', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #dadad3', paddingBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#e60023', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Citizen Portal
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '32px', color: '#000000', margin: 0 }}>
              Grievance Desk
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Submit new grievances and trace real-time resolution updates.
            </p>
          </div>
        </div>

        {/* Success Modal / State Overlay after filing */}
        {submissionSuccessData && (
          <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', flexShrink: 0 }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Complaint Registered Successfully
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Grievance has been cataloged under tracking Reference ID <strong style={{ color: '#024ad8', fontFamily: 'monospace' }}>{submissionSuccessData.complaint_number}</strong> and routed to <strong>{submissionSuccessData.department}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => copyToClipboard(submissionSuccessData.complaint_number)}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#ffffff', border: '1px solid #dadad3', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Copy size={13} /> {copied ? 'Copied' : 'Copy ID'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedComplaint(submissionSuccessData)
                      setSearchId(submissionSuccessData.complaint_number)
                      setSubmissionSuccessData(null)
                      document.getElementById('tracking-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#e60023', color: '#ffffff', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Search size={13} /> View Status Below
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: File a Complaint Form */}
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              📝 File a New Complaint
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Fill in details below to register a new civic issue in the Nagaragupta system.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="form-grid">
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card title="📋 Grievance Specifications">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Title */}
                  <div>
                    <FieldLabel required>Complaint Summary Title</FieldLabel>
                    <input
                      type="text"
                      placeholder="e.g. Broken drainage pipe on 4th Main Road"
                      value={form.title}
                      onChange={setFormField('title')}
                      style={{ ...inputStyle, borderColor: errors.title ? '#b3262b' : undefined }}
                    />
                    <ErrorText msg={errors.title} />
                  </div>

                  {/* Description */}
                  <div>
                    <FieldLabel required>Detailed Description</FieldLabel>
                    <textarea
                      placeholder="Please details what the issue is, how long it has been present, and any landmarks..."
                      value={form.description}
                      onChange={setFormField('description')}
                      onBlur={() => {
                        analyzeDescription(form.description)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (e.shiftKey) return;
                          e.preventDefault()
                          analyzeDescription(form.description)
                        }
                      }}
                      style={{ ...inputStyle, height: '100px', padding: '10px 14px', resize: 'vertical', borderColor: errors.description ? '#b3262b' : undefined }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ErrorText msg={errors.description} />
                      <span style={{ fontSize: '10px', color: '#64748b' }}>Press Enter (or click away) to analyze description · {form.description.length}/1000</span>
                    </div>

                    {/* AI dynamic feedback */}
                    {analyzingDescription && (
                      <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
                        Analyzing description for requirements...
                      </div>
                    )}
                    {!analyzingDescription && analysisReason && (
                      <div style={{
                        marginTop: '8px', padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
                        background: isPhotoMandatory ? '#fee2e2' : '#f1f5f9',
                        border: isPhotoMandatory ? '1px solid #fecaca' : '1px solid #cbd5e1',
                        color: isPhotoMandatory ? '#b3262b' : '#475569'
                      }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          {isPhotoMandatory ? '🚨 Photo Evidence Mandatory' : '📷 Photo Evidence Optional'}
                        </div>
                        <div>{analysisReason}</div>
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <FieldLabel required>Complaint Category</FieldLabel>
                    <select
                      value={form.category}
                      onChange={setFormField('category')}
                      style={{ ...inputStyle, borderColor: errors.category ? '#b3262b' : undefined }}
                    >
                      <option value="">Choose category...</option>
                      {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                    <ErrorText msg={errors.category} />
                  </div>

                  {/* Priority Select Buttons */}
                  <div>
                    <FieldLabel>Grievance Severity / Priority</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {PRIORITIES.map(p => {
                        const active = form.priority === p.value
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                            style={{
                              padding: '10px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'all 120ms',
                              border: active ? `2px solid ${p.color}` : '1px solid #dadad3',
                              background: active ? p.bg : '#ffffff'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '12px', color: active ? p.color : '#475569' }}>{p.label}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>{p.desc}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card title="📍 Location Specifics">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Location Area */}
                  <div>
                    <FieldLabel required>Location / Area / Street</FieldLabel>
                    <input
                      type="text"
                      placeholder="e.g. Ward 4, Outer Ring Road, Malleshwaram"
                      value={form.location}
                      onChange={setFormField('location')}
                      style={{ ...inputStyle, borderColor: errors.location ? '#b3262b' : undefined }}
                    />
                    <ErrorText msg={errors.location} />
                  </div>

                  {/* Landmark */}
                  <div>
                    <FieldLabel>Nearest Landmark</FieldLabel>
                    <input
                      type="text"
                      placeholder="e.g. Opposite Metro Station entrance"
                      value={form.landmark}
                      onChange={setFormField('landmark')}
                      style={inputStyle}
                    />
                  </div>

                </div>
              </Card>

              <Card title="📷 Media Attachments">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Drag and Drop Container */}
                  <div
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: dragging ? '2px dashed #e60023' : '2px dashed #dadad3',
                      borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer',
                      background: dragging ? 'rgba(230,0,35,0.02)' : '#ffffff', transition: 'all 150ms'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <ImageIcon size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Drag & Drop photos or browse</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Supports images up to 5 files.</div>
                  </div>
                  <ErrorText msg={errors.files} />

                  {/* File preview chips */}
                  {files.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {files.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          <span style={{ maxWidth: '140px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>🖼️ {f.name}</span>
                          <button
                            type="button"
                            onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </Card>

              {/* Consent and Submit buttons */}
              <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.isAnonymous}
                    onChange={setFormField('isAnonymous')}
                    style={{ cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Submit Anonymously</span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Hides your personal citizen profile information from department routing sheets.</span>
                  </div>
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid #f6f6f3', margin: 0 }} />

                <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={setFormField('consent')}
                    style={{ cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Declaration Consent</span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>I declare that the information provided is correct and coordinates correspond to the physical issue location.</span>
                  </div>
                </label>
                <ErrorText msg={errors.consent} />

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: '42px', background: '#e60023', color: '#ffffff', border: 'none', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: submitting ? 0.7 : 1, transition: 'all 120ms', marginTop: '6px'
                  }}
                >
                  {submitting ? 'Submitting...' : 'File Grievance'}
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Divider line */}
        <hr style={{ border: 'none', borderTop: '1px solid #dadad3', margin: 0 }} />

        {/* SECTION 2: Track & View Complaints */}
        <div id="tracking-section">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              📁 Track & View Complaints
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Lookup status timeline, assigned departments, and updates for any submitted grievance.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '4.5fr 7.5fr', gap: '24px' }} className="portal-grid">
            
            {/* Left list and search column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Lookup search box */}
              <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                <form onSubmit={triggerSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Reference Lookup
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Enter Complaint ID (e.g. COMP-2894)"
                        value={searchId}
                        onChange={e => setSearchId(e.target.value)}
                        style={{
                          width: '100%', height: '38px', padding: '0 12px 0 36px', borderRadius: '6px', border: '1px solid #dadad3',
                          fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 700
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '0 14px', height: '38px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Track
                    </button>
                  </div>
                  {searchError && <p style={{ fontSize: '11px', color: '#b3262b', margin: '4px 0 0 0' }}>⚠ {searchError}</p>}
                </form>
              </div>

              {/* List card wrapper */}
              <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                
                {/* Header list row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f6f6f3', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>My Complaints</h3>
                  <button 
                    onClick={refreshList}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['all', 'submitted', 'in_progress', 'resolved', 'closed'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '4px 10px', borderRadius: '12px', border: filter === f ? 'none' : '1px solid #dadad3',
                        background: filter === f ? '#000000' : '#ffffff',
                        color: filter === f ? '#ffffff' : '#475569',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 100ms'
                      }}
                    >
                      {f === 'all' ? 'All' : STATUS_META[f]?.label ?? f}
                    </button>
                  ))}
                </div>

                {/* Complaints mapping list */}
                <div style={{ overflowY: 'auto', maxHeight: '550px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {loadingList ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '12px' }}>
                      <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px' }} />
                      Loading complaints...
                    </div>
                  ) : filteredComplaints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 12px', color: '#64748b' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>No complaints cataloged</div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>File a complaint in the form above.</div>
                    </div>
                  ) : (
                    filteredComplaints.map(c => {
                      const active = selectedComplaint?.complaint_number === c.complaint_number
                      const statusInfo = STATUS_META[c.status] ?? { label: c.status, color: '#475569', bg: '#f1f5f9' }
                      return (
                        <div
                          key={c.id}
                          onClick={() => { setSelectedComplaint(c); setSearchId(c.complaint_number) }}
                          style={{
                            padding: '12px 14px', borderRadius: '8px', border: active ? '1px solid #e60023' : '1px solid #dadad3',
                            background: active ? 'rgba(230, 0, 37, 0.02)' : '#ffffff',
                            cursor: 'pointer', transition: 'all 120ms', display: 'flex', flexDirection: 'column', gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#e60023' }}>{c.complaint_number}</span>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                              background: statusInfo.bg, color: statusInfo.color
                            }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {CAT_ICON[c.category] ?? '📋'} {c.title}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', borderTop: '1px solid #f6f6f3', paddingTop: '4px' }}>
                            <span>📍 {c.location}</span>
                            <span>{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

              </div>

            </div>

            {/* Right detailed inspection column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {selectedComplaint ? (
                <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                  
                  {/* Detail Header */}
                  <div style={{ borderBottom: '1px solid #dadad3', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#e60023' }}>{selectedComplaint.complaint_number}</code>
                        <button 
                          onClick={() => copyToClipboard(selectedComplaint.complaint_number)}
                          style={{
                            background: 'transparent', border: '1px solid #dadad3', padding: '2px 8px', borderRadius: '4px',
                            fontSize: '10px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          <Copy size={10} /> {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{selectedComplaint.title}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                        background: STATUS_META[selectedComplaint.status]?.bg ?? '#f1f5f9',
                        color: STATUS_META[selectedComplaint.status]?.color ?? '#475569'
                      }}>
                        {STATUS_META[selectedComplaint.status]?.label ?? selectedComplaint.status}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                        background: PRIORITIES.find(p => p.value === selectedComplaint.priority)?.bg ?? '#f1f5f9',
                        color: PRIORITIES.find(p => p.value === selectedComplaint.priority)?.color ?? '#475569',
                        textTransform: 'uppercase'
                      }}>
                        {selectedComplaint.priority}
                      </span>
                    </div>
                  </div>

                  {/* Split Layout inside detail card */}
                  <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px' }}>
                    
                    {/* Left details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      <Card title="📁 Complaint Metadata">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <InfoRow icon="📋" label="Category" value={CAT_LABEL[selectedComplaint.category] ?? selectedComplaint.category} />
                          <InfoRow icon="📍" label="Address / Ward" value={selectedComplaint.location} />
                          {selectedComplaint.landmark && <InfoRow icon="🏪" label="Landmark" value={selectedComplaint.landmark} />}
                          {selectedComplaint.department && <InfoRow icon="🏢" label="Assigned Dept" value={selectedComplaint.department} />}
                          <InfoRow icon="📅" label="Submitted" value={formatDate(selectedComplaint.created_at)} />
                          <InfoRow icon="👤" label="Mode" value={selectedComplaint.is_anonymous ? 'Anonymous Submission' : 'Standard Submission'} />
                        </div>
                      </Card>

                      <Card title="📝 Description">
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {selectedComplaint.description}
                        </p>
                      </Card>

                    </div>

                    {/* Right Timeline & updates */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Timeline */}
                      <Card title="📡 Progress Tracker">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {STATUS_ORDER.map((step, idx) => {
                            const currentIdx = STATUS_ORDER.indexOf(selectedComplaint.status)
                            const done = idx <= currentIdx
                            const active = idx === currentIdx
                            const stepMeta = STATUS_META[step]
                            
                            // Synthetic timestamps
                            const stepDate = new Date(new Date(selectedComplaint.created_at).getTime() + idx * 3 * 3600 * 1000)

                            return (
                              <div key={step} style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
                                    border: done ? `2px solid ${stepMeta.color}` : '1.5px solid #dadad3',
                                    background: done ? stepMeta.bg : '#ffffff', color: done ? stepMeta.color : '#64748b'
                                  }}>
                                    {done ? stepMeta.icon : '○'}
                                  </div>
                                  {idx < STATUS_ORDER.length - 1 && (
                                    <div style={{ width: '2px', flex: 1, minHeight: '20px', background: done && idx < currentIdx ? stepMeta.color : '#e2e8f0', margin: '2px 0' }} />
                                  )}
                                </div>
                                <div style={{ paddingBottom: idx < STATUS_ORDER.length - 1 ? '16px' : '0', paddingTop: '2px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: active ? 700 : 600, color: done ? stepMeta.color : '#94a3b8' }}>
                                    {stepMeta.label}
                                    {active && <span style={{ marginLeft: '6px', fontSize: '9px', background: stepMeta.bg, color: stepMeta.color, padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }}>Active</span>}
                                  </div>
                                  {done && (
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                      {step === 'submitted' ? formatDate(selectedComplaint.created_at) : stepDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + stepDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Card>

                      {/* Notes / updates */}
                      <Card title="💬 Public Updates">
                        {(() => {
                          let parsedNotes: any[] = []
                          try {
                            if (selectedComplaint.notes) {
                              const parsed = JSON.parse(selectedComplaint.notes)
                              if (Array.isArray(parsed)) {
                                parsedNotes = parsed.filter(n => n.type === 'public')
                              }
                            }
                          } catch (e) {}

                          if (parsedNotes.length === 0) {
                            return <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>No public comments or officer updates logged.</p>
                          }

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {parsedNotes.map((note: any, i) => (
                                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px' }}>
                                  <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: '2px' }}>👮 {note.author}</div>
                                  <div style={{ color: '#0f172a', lineHeight: 1.4 }}>{note.text}</div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                                    {new Date(note.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </Card>

                    </div>

                  </div>

                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid #dadad3', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '64px 24px', flex: 1 }}>
                  <Search size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <strong>No complaint selected</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Select an item in the list or lookup by Reference ID to trace progress.</span>
                </div>
              )}

            </div>

      </div>
    </div>
  </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input, select, textarea {
          transition: border-color 0.15s ease-in-out;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #e60023 !important;
          box-shadow: 0 0 0 2px rgba(230, 0, 35, 0.1);
        }
        @media (max-width: 820px) {
          .portal-grid, .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </main>
  )
}

export default function CitizenPortalPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f6f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px' }} />
          Loading Citizen Portal...
        </div>
      </div>
    }>
      <CitizenPortalContent />
    </Suspense>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '40px', padding: '0 12px',
  borderRadius: '6px', border: '1px solid #dadad3',
  background: '#ffffff', fontSize: '13px', color: '#0f172a',
  outline: 'none', boxSizing: 'border-box'
}
