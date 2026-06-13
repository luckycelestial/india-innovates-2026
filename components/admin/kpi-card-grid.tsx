'use client'

import { FolderOpen, Inbox, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

type KpiCardGridProps = {
  total: number
  open: number
  resolved: number
  overdue: number
  escalated: number
}

const FONT_DISPLAY = "var(--font-display)"
const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function KpiCardGrid({ total, open, resolved, overdue, escalated }: KpiCardGridProps) {
  const cards = [
    { label: 'Total Complaints', value: total, icon: FolderOpen, color: '#0f172a', bg: '#f1f5f9', border: '#e2e8f0' },
    { label: 'Pending / Open', value: open, icon: Inbox, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Resolved Cases', value: resolved, icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'Overdue SLA', value: overdue, icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
    { label: 'Escalated Items', value: escalated, icon: AlertCircle, color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '28px',
      fontFamily: FONT_SANS
    }}>
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: `1px solid ${card.border}`,
            padding: '20px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            cursor: 'default'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: card.bg,
              color: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={24} />
            </div>
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: '28px',
                color: '#0f172a',
                lineHeight: 1.2
              }}>
                {card.value}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#64748b',
                fontWeight: 600,
                marginTop: '2px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                {card.label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
