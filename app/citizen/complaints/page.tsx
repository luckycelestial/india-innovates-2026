'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
type Complaint = {
  id: string
  complaint_number: string
  title: string
  category: string
  status: string
  priority: string
  location: string
  created_at: string
  department: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:   { label: 'Submitted',   color: '#1a2a5e', bg: '#e8edf7' },
  assigned:    { label: 'Assigned',    color: '#024ad8', bg: '#e8f0fe' },
  in_progress: { label: 'In Progress', color: '#b45309', bg: '#fef3c7' },
  resolved:    { label: 'Resolved',    color: '#166534', bg: '#dcfce7' },
  closed:      { label: 'Closed',      color: '#636363', bg: '#f7f7f7' },
}

const PRIORITY_DOT: Record<string, string> = {
  low: '#636363', medium: '#024ad8', high: '#b45309', urgent: '#b3262b',
}

const CAT_ICON: Record<string, string> = {
  road: '🛣️', water: '💧', electricity: '⚡', sanitation: '🧹',
  streetlight: '💡', drainage: '🌊', waste: '🗑️', parks: '🌳', noise: '🔊', other: '📋',
}

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#636363', bg: '#f7f7f7' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 'var(--rounded-pill)',
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span style={{
      display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
      background: PRIORITY_DOT[priority] ?? '#636363', flexShrink: 0,
    }} />
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Complaint card ───────────────────────────────────────────────────────────
function ComplaintCard({ c }: { c: Complaint }) {
  return (
    <Link href={`/citizen/complaints/${c.complaint_number}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
        border: '1px solid var(--color-hairline)', padding: '20px 22px',
        boxShadow: 'var(--shadow-soft-lift)',
        transition: 'box-shadow 160ms, border-color 160ms',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-floating)'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-steel)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-soft-lift)'
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-hairline)'
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{CAT_ICON[c.category] ?? '📋'}</span>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.title}
            </div>
          </div>
          <StatusChip status={c.status} />
        </div>

        {/* ID + priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.3px' }}>{c.complaint_number}</code>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-charcoal)', fontWeight: 500, textTransform: 'capitalize' }}>
            <PriorityDot priority={c.priority} />{c.priority}
          </span>
        </div>

        {/* Location + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-graphite)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {c.location}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-graphite)', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</span>
        </div>

        {c.department && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)', fontSize: '11px', color: 'var(--color-charcoal)' }}>
            🏢 {c.department}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', color: 'var(--color-ink)', marginBottom: '8px' }}>No complaints yet</h3>
      <p style={{ fontSize: '14px', color: 'var(--color-charcoal)', marginBottom: '24px' }}>You haven't submitted any complaints. Raise your first one below.</p>
      <Link href="/citizen/complaint/new" style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '12px 24px', borderRadius: 'var(--rounded-md)',
        background: 'var(--color-primary)', color: '#fff',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
        letterSpacing: '0.7px', textTransform: 'uppercase', textDecoration: 'none',
      }}>📝 Raise a Complaint</Link>
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 'var(--rounded-pill)', cursor: 'pointer',
      background: active ? 'var(--color-ink)' : 'var(--color-canvas)',
      color: active ? '#fff' : 'var(--color-ink)',
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
      border: active ? 'none' : '1px solid var(--color-steel)',
      transition: 'all 150ms',
    } as React.CSSProperties}>{label}</button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyComplaintsPage() {
  const supabase = createClient()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser({ email: u?.email, id: u?.id })

      // Fetch all complaints (for demo: show all; in prod filter by submitted_by)
      const { data, error } = await supabase
        .from('complaints')
        .select('id,complaint_number,title,category,status,priority,location,created_at,department')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) setComplaints(data)
      setLoading(false)
    }
    load()
  }, [])

  const FILTERS = ['all', 'submitted', 'in_progress', 'resolved', 'closed']
  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  const counts = complaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)' }}>


      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 16px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Citizen Portal</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '36px', lineHeight: 1.0, color: 'var(--color-ink)', marginBottom: '6px' }}>My Complaints</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>
            {user?.email ? `Signed in as ${user.email}` : 'All submitted complaints'}
          </p>
        </div>

        {/* Stats row */}
        {complaints.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total', value: complaints.length, color: 'var(--color-ink)' },
              { label: 'Open', value: (counts.submitted ?? 0) + (counts.assigned ?? 0) + (counts.in_progress ?? 0), color: '#024ad8' },
              { label: 'Resolved', value: counts.resolved ?? 0, color: '#166534' },
              { label: 'Closed', value: counts.closed ?? 0, color: '#636363' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--color-canvas)', borderRadius: 'var(--rounded-lg)', border: '1px solid var(--color-hairline)', padding: '16px 18px', boxShadow: 'var(--shadow-soft-lift)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', color: stat.color, lineHeight: 1, marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-charcoal)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {complaints.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {FILTERS.map(f => (
              <FilterPill key={f} label={f === 'all' ? `All (${complaints.length})` : `${STATUS_CONFIG[f]?.label ?? f} (${counts[f] ?? 0})`} active={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-charcoal)', fontSize: '14px' }}>
            Loading complaints…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(c => <ComplaintCard key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </main>
  )
}
