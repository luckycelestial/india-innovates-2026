'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type ComplaintData = {
  id: string
  title: string
  category: string
  department: string
  submittedAt: string
  status: string
}

const DEPT_MAP: Record<string, string> = {
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
}

const CATEGORY_LABELS: Record<string, string> = {
  road: 'Road & Pavement', water: 'Water Supply', electricity: 'Electricity',
  sanitation: 'Sanitation & Cleanliness', streetlight: 'Street Lighting',
  drainage: 'Drainage & Waterlogging', waste: 'Solid Waste Management',
  parks: 'Parks & Public Spaces', noise: 'Noise Pollution', other: 'Other',
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      style={{
        padding: '6px 12px', borderRadius: 'var(--rounded-md)',
        border: '1px solid var(--color-steel)', background: copied ? '#dcfce7' : 'var(--color-canvas)',
        color: copied ? '#166534' : 'var(--color-charcoal)',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px',
        cursor: 'pointer', transition: 'all 200ms', letterSpacing: '0.3px',
        display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  )
}

function StepRow({ n, label, desc, active }: { n: string; label: string; desc: string; active?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-hairline)',
        background: active ? '#e8f0fe' : 'var(--color-cloud)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px',
        color: active ? 'var(--color-primary)' : 'var(--color-graphite)',
      }}>{n}</div>
      <div style={{ paddingTop: '4px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: active ? 'var(--color-primary)' : 'var(--color-ink)' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-graphite)', marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  )
}

function SuccessContent() {
  const params = useSearchParams()
  const [animIn, setAnimIn] = useState(false)
  const [checkDone, setCheckDone] = useState(false)

  const data: ComplaintData = {
    id: params.get('id') ?? 'PRJ-2026-0001',
    title: params.get('title') ?? 'Civic Complaint',
    category: params.get('category') ?? 'other',
    department: params.get('dept') ?? 'General Administration',
    submittedAt: params.get('time') ?? new Date().toISOString(),
    status: 'Submitted',
  }

  useEffect(() => {
    const t1 = setTimeout(() => setAnimIn(true), 80)
    const t2 = setTimeout(() => setCheckDone(true), 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const submittedDate = new Date(data.submittedAt)
  const formattedDate = submittedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const formattedTime = submittedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dept = DEPT_MAP[data.category] ?? data.department
  const catLabel = CATEGORY_LABELS[data.category] ?? data.category

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{
        maxWidth: '560px', width: '100%',
        opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 420ms ease, transform 420ms ease',
      }}>
        <div style={{
          background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
          border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-floating)',
          overflow: 'hidden',
        }}>
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #024ad8 0%, #296ef9 100%)' }} />

          <div style={{ padding: '40px 36px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
                border: `2px solid ${checkDone ? '#86efac' : 'var(--color-hairline)'}`,
                background: checkDone ? '#dcfce7' : 'var(--color-cloud)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '30px', transition: 'all 400ms ease',
              }}>
                {checkDone ? '✓' : '⏳'}
              </div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '24px',
                color: 'var(--color-ink)', lineHeight: 1.1, marginBottom: '8px',
              }}>
                Complaint Submitted Successfully
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-charcoal)', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto' }}>
                Your grievance is now registered in the PRAJA system and will be routed to <strong>{dept}</strong> for review.
              </p>
            </div>

            <div style={{
              background: 'var(--color-cloud)', borderRadius: 'var(--rounded-lg)',
              border: '1px solid var(--color-hairline)', padding: '20px 20px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-hairline)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Complaint ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '22px', color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>{data.id}</div>
                </div>
                <CopyButton value={data.id} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Status', value: '🟢 Submitted', highlight: true },
                  { label: 'Category', value: catLabel },
                  { label: 'Submitted On', value: formattedDate },
                  { label: 'Time', value: formattedTime },
                  { label: 'Routed To', value: dept, span: true },
                ].map((row, i) => (
                  <div key={i} style={{ gridColumn: row.span ? '1 / -1' : undefined }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '2px' }}>{row.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: row.highlight ? 700 : 500, color: row.highlight ? '#166534' : 'var(--color-ink)' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 'var(--rounded-md)', background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-graphite)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '4px' }}>Complaint</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{data.title}</div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '14px' }}>
                What happens next
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StepRow n="✓" label="Complaint received" desc="PRAJA has recorded your grievance." />
                <StepRow n="2" label="Department routing" desc={`Your complaint is being routed to ${dept}.`} active />
                <StepRow n="3" label="Officer assignment" desc="An officer will be assigned within 24 hours." />
                <StepRow n="4" label="Resolution & closure" desc="You'll receive status updates at each step." />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href={`/citizen/track?id=${data.id}`}
                id="btn-track-complaint"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '50px', borderRadius: 'var(--rounded-md)',
                  background: 'var(--color-primary)', color: '#fff',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                  letterSpacing: '0.7px', textTransform: 'uppercase', textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(2,74,216,0.25)',
                }}
              >
                🔍 Track Complaint
              </Link>
              <Link
                href="/citizen/home"
                id="btn-go-home"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '46px', borderRadius: 'var(--rounded-md)',
                  border: '1px solid var(--color-steel)', background: 'var(--color-canvas)', color: 'var(--color-ink)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px',
                  letterSpacing: '0.5px', textTransform: 'uppercase', textDecoration: 'none',
                }}
              >
                ← Return to Dashboard
              </Link>
              <Link
                href="/citizen/complaint/new"
                id="btn-submit-another"
                style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'underline', padding: '4px' }}
              >
                Submit another complaint
              </Link>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--color-graphite)', lineHeight: 1.5 }}>
          Save your complaint ID <strong>{data.id}</strong> to track status anytime.<br />
          No registration required — just enter your ID at the Track page.
        </p>
      </div>
    </div>
  )
}

export default function SubmissionSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', color: 'var(--color-charcoal)', fontSize: '15px' }}>Loading…</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
