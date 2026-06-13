'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Complaint = {
  id: string
  complaint_number: string
  title: string
  status: string
  category: string
  created_at: string
  priority: string
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  submitted:   { label: 'Submitted',   color: '#1a2a5e', bg: '#e8edf7', icon: '📝' },
  assigned:    { label: 'Assigned',    color: '#024ad8', bg: '#e8f0fe', icon: '📬' },
  in_progress: { label: 'In Progress', color: '#b45309', bg: '#fef3c7', icon: '⚙️' },
  resolved:    { label: 'Resolved',    color: '#166534', bg: '#dcfce7', icon: '✅' },
  closed:      { label: 'Closed',      color: '#636363', bg: '#f7f7f7', icon: '🔒' },
}

const CAT_ICON: Record<string, string> = {
  road: '🛣️', water: '💧', electricity: '⚡', sanitation: '🧹',
  streetlight: '💡', drainage: '🌊', waste: '🗑️', parks: '🌳', noise: '🔊', other: '📋',
}

export default function CitizenHome() {
  const supabase = createClient()
  const [recent, setRecent] = useState<Complaint[]>([])
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser({ email: u?.email })
      const { data } = await supabase
        .from('complaints')
        .select('id,complaint_number,title,status,category,created_at,priority')
        .order('created_at', { ascending: false })
        .limit(3)
      if (data) setRecent(data)
      setLoading(false)
    }
    load()
  }, [])

  const firstName = user?.email?.split('@')[0] ?? 'Citizen'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-cloud)' }}>


      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 16px 64px' }}>
        {/* Welcome banner */}
        <div style={{
          background: 'var(--color-ink)', borderRadius: 'var(--rounded-xl)',
          padding: '36px 40px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px',
        }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-bright)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Citizen Portal</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '32px', color: 'var(--color-on-ink)', lineHeight: 1.1, marginBottom: '8px' }}>
              Welcome, {firstName} 👋
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--color-steel)', lineHeight: 1.5, maxWidth: '380px' }}>
              File new complaints, track their progress, and hold your civic authorities accountable — all from here.
            </p>
          </div>
          <Link href="/citizen/complaint/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px', borderRadius: 'var(--rounded-md)',
            background: 'var(--color-primary-bright)', color: '#fff',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
            letterSpacing: '0.7px', textTransform: 'uppercase', textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(41,110,249,0.35)', whiteSpace: 'nowrap',
          }}>
            📝 Raise a Complaint
          </Link>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { icon: '📝', label: 'Raise Complaint', desc: 'Submit a new civic issue', href: '/citizen/complaint/new', accent: 'var(--color-primary)' },
            { icon: '📋', label: 'My Complaints', desc: 'View all your submissions', href: '/citizen/complaints', accent: '#1a2a5e' },
            { icon: '🔍', label: 'Track by ID', desc: 'Look up any complaint', href: '/citizen/track', accent: '#356373' },
          ].map(action => (
            <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
                border: '1px solid var(--color-hairline)', padding: '20px 18px',
                boxShadow: 'var(--shadow-soft-lift)', textAlign: 'center', cursor: 'pointer',
                transition: 'box-shadow 160ms, border-color 160ms',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-floating)'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = action.accent
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-soft-lift)'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-hairline)'
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{action.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--color-ink)', marginBottom: '4px' }}>{action.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-graphite)' }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent complaints */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--color-ink)' }}>Recent Complaints</h2>
            <Link href="/citizen/complaints" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-charcoal)', fontSize: '14px' }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)', border: '1px solid var(--color-hairline)', padding: '40px 24px', textAlign: 'center', boxShadow: 'var(--shadow-soft-lift)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>No complaints yet. Raise your first one above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recent.map(c => {
                const sm = STATUS_META[c.status] ?? { label: c.status, color: '#636363', bg: '#f7f7f7', icon: '❓' }
                return (
                  <Link key={c.id} href={`/citizen/complaints/${c.complaint_number}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
                      border: '1px solid var(--color-hairline)', padding: '16px 20px',
                      boxShadow: 'var(--shadow-soft-lift)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      transition: 'box-shadow 160ms',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-floating)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-soft-lift)'}
                    >
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{CAT_ICON[c.category] ?? '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{c.title}</div>
                        <code style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-primary)' }}>{c.complaint_number}</code>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--rounded-pill)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: sm.color, background: sm.bg }}>
                          {sm.icon} {sm.label}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-graphite)' }}>
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
