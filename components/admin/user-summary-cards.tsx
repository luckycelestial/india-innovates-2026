'use client'

import { Users, Shield, UserX, UserMinus, ShieldAlert } from 'lucide-react'

type UserSummaryCardsProps = {
  citizensCount: number
  adminsCount: number
  suspendedCount: number
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function UserSummaryCards({
  citizensCount,
  adminsCount,
  suspendedCount
}: UserSummaryCardsProps) {
  const cards = [
    { label: 'Total Citizens', value: citizensCount, icon: Users, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Total Admins', value: adminsCount, icon: ShieldAlert, color: '#0f172a', bg: '#f1f5f9', border: '#e2e8f0' },
    { label: 'Suspended', value: suspendedCount, icon: UserX, color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
            padding: '16px 20px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'default'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: card.bg,
              color: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={20} />
            </div>
            <div>
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: '24px',
                color: '#0f172a',
                lineHeight: 1.2
              }}>
                {card.value}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
                marginTop: '2px'
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
