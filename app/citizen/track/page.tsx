'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  created_at: string
  updated_at: string
  notes: string | null // JSON string of Note[]
}

const STATUS_ORDER = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']

const STATUS_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  submitted:   { label: 'Submitted',   icon: '📝', color: '#1a2a5e', bg: '#e8edf7' },
  assigned:    { label: 'Assigned',    icon: '📬', color: '#024ad8', bg: '#e8f0fe' },
  in_progress: { label: 'In Progress', icon: '⚙️', color: '#b45309', bg: '#fef3c7' },
  resolved:    { label: 'Resolved',    icon: '✅', color: '#166534', bg: '#dcfce7' },
  closed:      { label: 'Closed',      icon: '🔒', color: '#636363', bg: '#f7f7f7' },
  escalated:   { label: 'Escalated',   icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#475569', bg: '#f1f5f9' },
  medium: { label: 'Medium', color: '#024ad8', bg: '#e8f0fe' },
  high:   { label: 'High',   color: '#b45309', bg: '#fef3c7' },
  urgent: { label: 'Urgent', color: '#b3262b', bg: '#fee2e2' },
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
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-soft-lift)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-cloud)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--color-charcoal)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function TrackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const idQuery = params.get('id') ?? ''
  
  const [searchId, setSearchId] = useState(idQuery)
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notesList, setNotesList] = useState<Note[]>([])

  useEffect(() => {
    if (idQuery) {
      handleSearch(idQuery)
    } else {
      setComplaint(null)
      setSearched(false)
    }
  }, [idQuery])

  const handleSearch = async (targetId: string) => {
    if (!targetId.trim()) return
    setLoading(true)
    setSearched(true)
    setError(false)

    try {
      const { data, error: fetchErr } = await supabase
        .from('complaints')
        .select('*')
        .eq('complaint_number', targetId.trim().toUpperCase())
        .single()

      if (fetchErr || !data) {
        setComplaint(null)
      } else {
        setComplaint(data)
        // Parse notes
        try {
          if (data.notes) {
            const parsed = JSON.parse(data.notes)
            if (Array.isArray(parsed)) {
              setNotesList(parsed)
            }
          } else {
            setNotesList([])
          }
        } catch (e) {
          setNotesList([])
        }
      }
    } catch (e) {
      setComplaint(null)
    } finally {
      setLoading(false)
    }
  }

  const [error, setError] = useState(false)

  const triggerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) return
    router.push(`/citizen/track?id=${searchId.trim().toUpperCase()}`)
  }

  const copyId = () => {
    if (!complaint) return
    navigator.clipboard.writeText(complaint.complaint_number)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter public updates
  const publicUpdates = notesList.filter(n => n.type === 'public')

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Page title */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Citizen Portal
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '36px', lineHeight: 1.0, color: 'var(--color-ink)', marginBottom: '8px' }}>
            Track Complaint Status
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
            Lookup the real-time progress, assigned officer, and updates for any filed grievance.
          </p>
        </div>

        {/* Lookup Card */}
        <div style={{
          background: 'var(--color-canvas)',
          borderRadius: 'var(--rounded-xl)',
          border: '1px solid var(--color-hairline)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-soft-lift)',
          marginBottom: '28px'
        }}>
          <form onSubmit={triggerSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Enter Complaint Reference ID
              </label>
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="e.g. PRJ-2026-0001"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: 'var(--rounded-md)',
                  border: '1px solid var(--color-steel)',
                  fontSize: '14px',
                  outline: 'none',
                  textTransform: 'uppercase'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                alignSelf: 'flex-end',
                height: '42px',
                padding: '0 24px',
                borderRadius: 'var(--rounded-md)',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Search ID
            </button>
          </form>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-charcoal)' }}>
            Retrieving grievance details...
          </div>
        ) : searched && !complaint ? (
          <div style={{
            background: 'var(--color-canvas)',
            borderRadius: 'var(--rounded-xl)',
            border: '1px solid var(--color-hairline)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft-lift)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>
              Complaint Not Found
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>
              Could not find any complaint matching ID <code style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{idQuery}</code>. Please check for spelling mistakes.
            </p>
          </div>
        ) : complaint ? (
          /* Main Tracking Interface */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
            
            {/* Left Column: Summary and Updates Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Summary */}
              <Card title="📋 Grievance Summary">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '12px', marginBottom: '4px' }}>
                    <div>
                      <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>{complaint.complaint_number}</code>
                      <button onClick={copyId} style={{
                        marginLeft: '10px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--color-steel)',
                        background: copied ? '#dcfce7' : 'var(--color-canvas)', color: copied ? '#166534' : 'var(--color-charcoal)',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms',
                      }}>
                        {copied ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <div>
                      <span style={{
                        padding: '4px 12px', borderRadius: 'var(--rounded-pill)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
                        color: STATUS_META[complaint.status]?.color ?? '#636363',
                        background: STATUS_META[complaint.status]?.bg ?? '#f7f7f7'
                      }}>
                        {STATUS_META[complaint.status]?.icon} {STATUS_META[complaint.status]?.label ?? complaint.status}
                      </span>
                    </div>
                  </div>

                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>
                    {complaint.title}
                  </h2>

                  <InfoRow icon={CAT_ICON[complaint.category] ?? '📋'} label="Category" value={CAT_LABEL[complaint.category] ?? complaint.category} />
                  <InfoRow icon="📍" label="Location" value={complaint.location} />
                  {complaint.landmark && <InfoRow icon="🏪" label="Landmark Reference" value={complaint.landmark} />}
                  {complaint.department && <InfoRow icon="🏢" label="Assigned Department" value={complaint.department} />}
                  <InfoRow icon="📅" label="Submitted On" value={formatDate(complaint.created_at)} />
                  <InfoRow icon="🔄" label="Last Update Action" value={formatDate(complaint.updated_at)} />
                </div>
              </Card>

              {/* Citizen Updates Feed */}
              <Card title="📢 Citizen Progress Feed">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {publicUpdates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-graphite)', fontSize: '13px' }}>
                      No public updates registered. Standard assignment sequence initiated.
                    </div>
                  ) : (
                    publicUpdates.map(update => (
                      <div
                        key={update.id}
                        style={{
                          background: 'var(--color-cloud)',
                          border: '1px solid var(--color-hairline)',
                          borderRadius: '8px',
                          padding: '14px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            📢 Official Update
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-graphite)' }}>
                            {new Date(update.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                          {update.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Workflow Timelines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '72px' }}>
              
              {/* Vertical Stepper */}
              <Card title="📡 Progress Timeline">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {STATUS_ORDER.map((step, i) => {
                    const meta = STATUS_META[step]
                    const currentIdx = STATUS_ORDER.indexOf(complaint.status)
                    const done = i <= currentIdx
                    const active = i === currentIdx

                    return (
                      <div key={step} style={{ display: 'flex', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                            border: done ? `2px solid ${meta.color}` : '1.5px solid var(--color-steel)',
                            background: done ? meta.bg : 'var(--color-cloud)',
                            fontWeight: active ? 800 : 400,
                            zIndex: 1,
                          }}>{done ? meta.icon : '○'}</div>
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

              {/* Actions */}
              <Card title="⚡ Citizen Actions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => handleSearch(complaint.complaint_number)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      height: '42px', borderRadius: 'var(--rounded-md)', border: 'none',
                      background: 'var(--color-ink)', color: '#fff',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px',
                      letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    🔄 Refresh Status
                  </button>
                  <Link href="/citizen/complaint/new" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    height: '42px', borderRadius: 'var(--rounded-md)',
                    border: '1px solid var(--color-steel)', color: 'var(--color-ink)',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px',
                    letterSpacing: '0.5px', textTransform: 'uppercase', textDecoration: 'none',
                  }}>
                    📝 Raise New Issue
                  </Link>
                </div>
              </Card>
            </div>

          </div>
        ) : (
          /* Empty Lookup prompt */
          <div style={{
            background: 'var(--color-canvas)',
            borderRadius: 'var(--rounded-xl)',
            border: '1px solid var(--color-hairline)',
            padding: '64px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft-lift)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>
              Track Grievance Registry
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>
              Enter your complaint reference ID above (e.g. PRJ-2026-0001) to trace the live workflow.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--color-charcoal)', fontSize: '15px' }}>Loading tracking engine…</div>
      </main>
    }>
      <TrackContent />
    </Suspense>
  )
}
