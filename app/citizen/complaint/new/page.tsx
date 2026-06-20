'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>
      {children}
      {required && <span style={{ color: '#b3262b', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '11px', color: 'var(--color-graphite)', marginTop: '4px' }}>{children}</p>
}

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: '11px', color: '#b3262b', marginTop: '4px' }}>⚠ {msg}</p>
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '44px', padding: '0 14px',
  borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-steel)',
  background: 'var(--color-canvas)', fontFamily: 'var(--font-body)',
  fontSize: '14px', color: 'var(--color-ink)', outline: 'none',
  transition: 'border 120ms',
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
      border: '1px solid var(--color-hairline)', padding: '28px 28px',
      boxShadow: 'var(--shadow-soft-lift)',
    }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px', color: 'var(--color-ink)', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--color-hairline)' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {children}
      </div>
    </div>
  )
}

type FormData = {
  title: string
  category: string
  description: string
  location: string
  landmark: string
  priority: string
  isAnonymous: boolean
  consent: boolean
}

type Errors = Partial<Record<keyof FormData, string>> & { files?: string }

export default function ComplaintSubmissionPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    title: '', category: '', description: '',
    location: '', landmark: '', priority: 'medium',
    isAnonymous: false, consent: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Groq dynamic photo requirement analysis state
  const [isPhotoMandatory, setIsPhotoMandatory] = useState(false)
  const [analysisReason, setAnalysisReason] = useState('')
  const [analyzingDescription, setAnalyzingDescription] = useState(false)

  const analyzeDescriptionText = async (text: string) => {
    if (text.trim().length < 20) {
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
      }
    } catch (err) {
      console.error('Failed to analyze description:', err)
    } finally {
      setAnalyzingDescription(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      analyzeDescriptionText(form.description)
    }, 800)
    return () => clearTimeout(delayDebounce)
  }, [form.description])

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'Complaint title is required.'
    if (!form.category) e.category = 'Please select a category.'
    if (!form.description.trim() || form.description.length < 20) e.description = 'Description must be at least 20 characters.'
    if (!form.location.trim()) e.location = 'Location is required for routing.'
    if (isPhotoMandatory && files.length === 0) {
      e.files = 'Photo evidence is mandatory for this type of issue. Please upload a photo.'
    }
    if (!form.consent) e.consent = 'You must confirm the declaration before submitting.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    setFiles(prev => [...prev, ...dropped].slice(0, 5))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' }); return }

    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('complaints').insert({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        location: form.location.trim(),
        landmark: form.landmark.trim() || null,
        priority: form.priority,
        is_anonymous: form.isAnonymous,
        submitted_by: form.isAnonymous ? null : (userData?.user?.id ?? null),
        department: getCategoryDept(form.category),
      }).select('complaint_number, title, category, status').single()

      if (error) throw error
      const params = new URLSearchParams({
        id: data.complaint_number,
        title: data.title,
        category: data.category,
        time: new Date().toISOString(),
        dept: getCategoryDept(data.category),
      })
      router.push(`/citizen/complaint/success?${params.toString()}`)
    } catch (err) {
      console.error(err)
      alert('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryDept = (cat: string) => ({
    road: 'Public Works Department', water: 'Water Supply Board', electricity: 'Electricity Department',
    sanitation: 'Sanitation Department', streetlight: 'Street Lighting Division',
    drainage: 'Storm Water Drains Department', waste: 'Solid Waste Management', parks: 'Parks & Gardens Department',
    noise: 'Pollution Control Board', other: 'General Administration',
  }[cat] ?? 'General Administration')

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', padding: '36px 16px 80px' }} id="form-top">
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Citizen Portal
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '36px', lineHeight: 1.0, color: 'var(--color-ink)', marginBottom: '8px' }}>
            Raise a Complaint
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
            Fill in the details below. All fields marked <span style={{ color: '#b3262b' }}>*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionCard title="📋 Complaint Details">
            <div>
              <FieldLabel required>Complaint Title</FieldLabel>
              <input
                id="field-title"
                style={{ ...inputStyle, borderColor: errors.title ? '#b3262b' : undefined }}
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Large pothole on MG Road near bus stop"
                maxLength={120}
                onFocus={e => { e.target.style.borderColor = 'var(--color-ink)'; e.target.style.borderWidth = '2px' }}
                onBlur={e => { e.target.style.borderColor = errors.title ? '#b3262b' : 'var(--color-steel)'; e.target.style.borderWidth = '1px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <ErrorText msg={errors.title} />
                <span style={{ fontSize: '11px', color: 'var(--color-graphite)', marginTop: '4px' }}>{form.title.length}/120</span>
              </div>
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                id="field-category"
                style={{ ...inputStyle, borderColor: errors.category ? '#b3262b' : undefined, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23636363' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }}
                value={form.category}
                onChange={set('category')}
                onFocus={e => { e.target.style.borderColor = 'var(--color-ink)'; e.target.style.borderWidth = '2px' }}
                onBlur={e => { e.target.style.borderColor = errors.category ? '#b3262b' : 'var(--color-steel)'; e.target.style.borderWidth = '1px' }}
              >
                <option value="">Select complaint category…</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ErrorText msg={errors.category} />
            </div>

            <div>
              <FieldLabel required>Description</FieldLabel>
              <textarea
                id="field-description"
                style={{ ...inputStyle, height: '120px', padding: '12px 14px', resize: 'vertical', borderColor: errors.description ? '#b3262b' : undefined }}
                value={form.description}
                onChange={set('description')}
                placeholder="Describe the issue in detail — what you see, since when, who it affects…"
                maxLength={1000}
                onFocus={e => { e.target.style.borderColor = 'var(--color-ink)'; e.target.style.borderWidth = '2px' }}
                onBlur={e => {
                  e.target.style.borderColor = errors.description ? '#b3262b' : 'var(--color-steel)';
                  e.target.style.borderWidth = '1px';
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ErrorText msg={errors.description} />
                <span style={{ fontSize: '11px', color: 'var(--color-graphite)', marginTop: '4px' }}>{form.description.length}/1000</span>
              </div>
              {analyzingDescription && (
                <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="animate-spin" style={{ display: 'inline-block', border: '1.5px solid #cbd5e1', borderTopColor: 'var(--color-primary)', borderRadius: '50%', width: '12px', height: '12px' }} />
                  Analyzing description for evidence requirements...
                </div>
              )}
              {!analyzingDescription && analysisReason && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: isPhotoMandatory ? '#fee2e2' : '#f1f5f9',
                  border: isPhotoMandatory ? '1px solid #fecaca' : '1px solid #cbd5e1',
                  color: isPhotoMandatory ? '#b3262b' : '#475569',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isPhotoMandatory ? '🚨 Photo Upload Mandatory' : '📷 Photo Upload Optional'}
                  </div>
                  <div>{analysisReason}</div>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    id={`priority-${p.value}`}
                    onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                    style={{
                      padding: '10px 8px', borderRadius: 'var(--rounded-md)', cursor: 'pointer',
                      border: form.priority === p.value ? `2px solid ${p.color}` : '1px solid var(--color-steel)',
                      background: form.priority === p.value ? p.bg : 'var(--color-canvas)',
                      textAlign: 'center', transition: 'all 140ms',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px', color: form.priority === p.value ? p.color : 'var(--color-charcoal)', letterSpacing: '0.3px' }}>{p.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-graphite)', marginTop: '2px', lineHeight: 1.3 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
              <HelperText>Choose based on public impact — Urgent is reserved for safety hazards.</HelperText>
            </div>
          </SectionCard>

          <SectionCard title="📍 Location Details">
            <div>
              <FieldLabel required>Area / Ward / Street</FieldLabel>
              <input
                id="field-location"
                style={{ ...inputStyle, borderColor: errors.location ? '#b3262b' : undefined }}
                value={form.location}
                onChange={set('location')}
                placeholder="e.g. Ward 42, Koramangala 4th Block, Bengaluru"
                onFocus={e => { e.target.style.borderColor = 'var(--color-ink)'; e.target.style.borderWidth = '2px' }}
                onBlur={e => { e.target.style.borderColor = errors.location ? '#b3262b' : 'var(--color-steel)'; e.target.style.borderWidth = '1px' }}
              />
              <ErrorText msg={errors.location} />
              <HelperText>Used to route the complaint to the correct department and officer.</HelperText>
            </div>

            <div>
              <FieldLabel>Nearest Landmark</FieldLabel>
              <input
                id="field-landmark"
                style={inputStyle}
                value={form.landmark}
                onChange={set('landmark')}
                placeholder="e.g. Near Reliance Fresh, opp. State Bank ATM"
                onFocus={e => { e.target.style.borderColor = 'var(--color-ink)'; e.target.style.borderWidth = '2px' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-steel)'; e.target.style.borderWidth = '1px' }}
              />
              <HelperText>Optional — helps the officer find the exact spot.</HelperText>
            </div>
          </SectionCard>

          <SectionCard title={isPhotoMandatory ? "📎 Evidence (Mandatory)" : "📎 Evidence (Optional)"}>
            {isPhotoMandatory && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b3262b',
                fontSize: '12px',
                fontWeight: 600
              }}>
                ⚠️ Based on description analysis, you must upload a photo as proof to submit this complaint.
              </div>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--color-primary)' : errors.files ? '#b3262b' : 'var(--color-steel)'}`,
                borderRadius: 'var(--rounded-lg)', padding: '32px',
                background: dragging ? '#e8f0fe' : 'var(--color-cloud)',
                textAlign: 'center', cursor: 'pointer', transition: 'all 160ms',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📷</div>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-charcoal)', marginBottom: '4px' }}>
                Drag & drop photos here, or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse files</span>
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-graphite)' }}>JPG, PNG, PDF — max 5 files, 10MB each</p>
            </div>
            <ErrorText msg={errors.files} />
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
              onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])].slice(0, 5))} />

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--rounded-md)', background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)' }}>
                    <span style={{ fontSize: '18px' }}>{f.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-graphite)', whiteSpace: 'nowrap' }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-graphite)', lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="✅ Review &amp; Submit">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: 'var(--rounded-md)', background: 'var(--color-cloud)', border: '1px solid var(--color-hairline)' }}>
              <button
                type="button"
                id="toggle-anonymous"
                onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
                style={{
                  width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                  background: form.isAnonymous ? 'var(--color-ink)' : 'var(--color-steel)',
                  position: 'relative', transition: 'background 180ms', flexShrink: 0, marginTop: '2px',
                }}
                aria-checked={form.isAnonymous}
                role="switch"
              >
                <span style={{
                  position: 'absolute', top: '3px', left: form.isAnonymous ? '21px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  transition: 'left 180ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', marginBottom: '2px' }}>Anonymous Submission</div>
                <div style={{ fontSize: '12px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                  {form.isAnonymous
                    ? '🔒 Your identity is hidden from public view. The complaint is still stored securely.'
                    : 'Your identity will be linked to this complaint for officer communication.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                type="checkbox"
                id="field-consent"
                checked={form.consent}
                onChange={set('consent')}
                style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-ink)' }}
              />
              <label htmlFor="field-consent" style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.6, cursor: 'pointer' }}>
                I declare that the information provided is true and submitted in good faith. I understand that filing a false complaint is a punishable offence under applicable law. <span style={{ color: '#b3262b' }}>*</span>
              </label>
            </div>
            <ErrorText msg={errors.consent} />

            <button
              id="btn-submit-complaint"
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', height: '50px', borderRadius: 'var(--rounded-md)', border: 'none',
                background: submitting ? 'var(--color-steel)' : 'var(--color-primary)',
                color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
                letterSpacing: '0.7px', textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 180ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {submitting ? <><Spinner /> Submitting Complaint…</> : '📝 Submit Complaint'}
            </button>

            <p style={{ fontSize: '11px', color: 'var(--color-graphite)', textAlign: 'center', lineHeight: 1.5 }}>
              Your complaint will be routed to the relevant department and assigned within 24 hours.
            </p>
          </SectionCard>
        </form>
      </div>
    </main>
  )
}

function Spinner() {
  return (
    <span style={{
      width: '18px', height: '18px',
      border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
      borderRadius: '50%', display: 'inline-block', animation: 'spin 0.65s linear infinite',
    }} />
  )
}
