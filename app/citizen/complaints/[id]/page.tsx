'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
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
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_ORDER = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']

const STATUS_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  submitted:   { label: 'Submitted',   icon: '📝', color: '#1a2a5e', bg: '#e8edf7' },
  assigned:    { label: 'Assigned',    icon: '📬', color: '#024ad8', bg: '#e8f0fe' },
  in_progress: { label: 'In Progress', icon: '⚙️', color: '#b45309', bg: '#fef3c7' },
  resolved:    { label: 'Resolved',    icon: '✅', color: '#166534', bg: '#dcfce7' },
  closed:      { label: 'Closed',      icon: '🔒', color: '#636363', bg: '#f7f7f7' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#636363', bg: '#f7f7f7' },
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

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: '#636363', bg: '#f7f7f7' }
  return (
    <span style={{ padding: '4px 12px', borderRadius: 'var(--rounded-pill)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>
      {m.icon} {m.label}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '14px', color: 'var(--color-ink)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ currentStatus, createdAt }: { currentStatus: string; createdAt: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  if (currentIdx === -1) return null

  // Build synthetic timeline steps for demo
  const steps = STATUS_ORDER.map((s, i) => {
    const meta = STATUS_META[s]
    const done = i <= currentIdx
    const active = i === currentIdx
    // Estimate timestamps (demo: +2h increments)
    const ts = new Date(new Date(createdAt).getTime() + i * 2 * 3600_000)
    return { status: s, meta, done, active, ts }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {steps.map((step, i) => (
        <div key={step.status} style={{ display: 'flex', gap: '14px' }}>
          {/* Dot + connector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              border: step.done ? `2px solid ${step.meta.color}` : '1.5px solid var(--color-steel)',
              background: step.done ? step.meta.bg : 'var(--color-cloud)',
              fontWeight: step.active ? 800 : 400,
              zIndex: 1,
            }}>{step.done ? step.meta.icon : '○'}</div>
            {i < steps.length - 1 && (
              <div style={{ width: '2px', flex: 1, minHeight: '24px', background: step.done && i < currentIdx ? step.meta.color : 'var(--color-hairline)', margin: '2px 0' }} />
            )}
          </div>

          {/* Content */}
          <div style={{ paddingBottom: i < steps.length - 1 ? '20px' : '0', paddingTop: '4px' }}>
            <div style={{ fontWeight: step.active ? 700 : 600, fontSize: '13px', color: step.done ? step.meta.color : 'var(--color-steel)', marginBottom: '2px' }}>
              {step.meta.label}
              {step.active && <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rounded-pill)', background: step.meta.bg, color: step.meta.color, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Current</span>}
            </div>
            {step.done && (
              <div style={{ fontSize: '12px', color: 'var(--color-graphite)' }}>
                {step.status === 'submitted' ? formatDate(createdAt) : `~${step.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${step.ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </div>
            )}
            {!step.done && (
              <div style={{ fontSize: '12px', color: 'var(--color-steel)' }}>Pending</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('complaint_number', decodeURIComponent(id))
        .single()

      if (!error && data) setComplaint(data)
      setLoading(false)
    }
    load()
  }, [id])

  const copyId = () => {
    navigator.clipboard.writeText(complaint?.complaint_number ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading
  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--color-charcoal)' }}>Loading complaint…</div>
    </main>
  )

  // Not found
  if (!complaint) return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>🔍</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--color-ink)' }}>Complaint not found</h2>
      <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>Complaint ID <code style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{decodeURIComponent(id)}</code> does not exist.</p>
      <Link href="/citizen/complaints" style={{ padding: '10px 20px', borderRadius: 'var(--rounded-md)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← My Complaints</Link>
    </main>
  )

  const priority = PRIORITY_CONFIG[complaint.priority] ?? PRIORITY_CONFIG.medium

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link href="/citizen/complaints" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-charcoal)', textDecoration: 'none', marginBottom: '12px' }}>
            ← Back to My Complaints
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: 'var(--color-primary)' }}>{complaint.complaint_number}</code>
                <button onClick={copyId} style={{
                  padding: '3px 10px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-steel)',
                  background: copied ? '#dcfce7' : 'var(--color-canvas)', color: copied ? '#166534' : 'var(--color-charcoal)',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 200ms',
                }}>
                  {copied ? '✓ Copied' : '📋 Copy ID'}
                </button>
                <StatusChip status={complaint.status} />
                <span style={{ padding: '3px 10px', borderRadius: 'var(--rounded-pill)', fontSize: '11px', fontWeight: 700, color: priority.color, background: priority.bg, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {priority.label} Priority
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '28px', lineHeight: 1.1, color: 'var(--color-ink)' }}>
                {complaint.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Complaint details */}
            <Card title="📋 Complaint Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow icon={CAT_ICON[complaint.category] ?? '📋'} label="Category" value={CAT_LABEL[complaint.category] ?? complaint.category} />
                <InfoRow icon="📍" label="Location" value={complaint.location} />
                {complaint.landmark && <InfoRow icon="🏪" label="Landmark" value={complaint.landmark} />}
                {complaint.department && <InfoRow icon="🏢" label="Department" value={complaint.department} />}
                <InfoRow icon="📅" label="Submitted On" value={formatDate(complaint.created_at)} />
                <InfoRow icon="🔄" label="Last Updated" value={formatDate(complaint.updated_at)} />
                <InfoRow icon="👤" label="Submission" value={complaint.is_anonymous ? '🔒 Anonymous' : 'Named submission'} />
              </div>
            </Card>

            {/* Description */}
            <Card title="📝 Description">
              <p style={{ fontSize: '15px', color: 'var(--color-ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {complaint.description}
              </p>
            </Card>

            {/* Attachments placeholder */}
            <Card title="📎 Attachments">
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-cloud)', borderRadius: 'var(--rounded-lg)', border: '1px dashed var(--color-steel)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)' }}>
                  {(complaint as any).attachment_urls?.length > 0 ? `${(complaint as any).attachment_urls.length} file(s) attached` : 'No attachments uploaded'}
                </p>
              </div>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '72px' }}>
            {/* Timeline */}
            <Card title="📡 Status Timeline">
              <Timeline currentStatus={complaint.status} createdAt={complaint.created_at} />
            </Card>

            {/* Quick actions for citizen */}
            <Card title="⚡ Actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link href="/citizen/complaint/new" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '44px', borderRadius: 'var(--rounded-md)',
                  background: 'var(--color-primary)', color: '#fff',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
                  letterSpacing: '0.5px', textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  📝 Submit New Complaint
                </Link>
                <Link href="/citizen/complaints" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '44px', borderRadius: 'var(--rounded-md)',
                  border: '1px solid var(--color-steel)', color: 'var(--color-ink)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
                  letterSpacing: '0.5px', textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  ← All Complaints
                </Link>
              </div>
              <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-graphite)', lineHeight: 1.5 }}>
                To raise a concern or escalation, contact the department listed above or use the Help section.
              </p>
            </Card>

            {/* Help */}
            <div style={{ background: '#e8f0fe', borderRadius: 'var(--rounded-lg)', border: '1px solid #c9e0fc', padding: '16px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#024ad8', marginBottom: '6px' }}>ℹ️ About this complaint</div>
              <p style={{ fontSize: '12px', color: '#1a2a5e', lineHeight: 1.6 }}>
                This complaint is currently <strong>{STATUS_META[complaint.status]?.label ?? complaint.status}</strong>. Officers from <em>{complaint.department ?? 'the relevant department'}</em> are handling it. You will see status updates here as it progresses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
