'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'

type Complaint = {
  id: string
  complaint_number: string
  title: string
  status: string
  priority: string
  department: string | null
  created_at: string
  slaText: string
}

type OverdueComplaintsPanelProps = {
  complaints: Complaint[]
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function OverdueComplaintsPanel({ complaints }: OverdueComplaintsPanelProps) {
  const router = useRouter()

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      fontFamily: FONT_SANS,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ color: '#ef4444' }} /> Urgent SLA Escalations
          </h3>
          <span style={{ fontSize: '12px', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
            {complaints.length} Critical
          </span>
        </div>

        {complaints.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            All operations are fully meeting SLA metrics.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.map(c => (
              <div
                key={c.id}
                onClick={() => router.push(`/officer/dashboard?complaint=${c.complaint_number}`)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 120ms',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f1f5f9'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#f1f5f9'
                  e.currentTarget.style.background = '#f8fafc'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6', fontSize: '12px' }}>
                      {c.complaint_number}
                    </code>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      color: c.priority === 'urgent' ? '#b91c1c' : '#b45309',
                      background: c.priority === 'urgent' ? '#fee2e2' : '#fef3c7'
                    }}>
                      {c.priority}
                    </span>
                  </div>
                  
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </h4>
                  
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {c.department || 'Unassigned Department'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#ef4444',
                    background: '#fff5f5',
                    border: '1px solid #fecaca',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {c.slaText}
                  </span>
                  
                  <ArrowRight size={14} style={{ color: '#94a3b8' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
