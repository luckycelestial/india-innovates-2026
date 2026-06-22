'use client'

import { useRouter } from 'next/navigation'
import { Scale, Kanban, FileText, Lock } from 'lucide-react'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function QuickActionsPanel() {
  const router = useRouter()

  const actions = [
    { label: 'Pipeline Tracker', desc: 'Track resolution workflow', href: '/officer/dashboard', icon: Kanban, color: '#10b981', bg: '#f0fdf4' },
    { label: 'Admin Settings', desc: 'Manage access controls', href: '#', icon: Lock, color: '#4b5563', bg: '#f3f4f6' },
  ]

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      fontFamily: FONT_SANS,
      height: '100%'
    }}>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>
        Console Quick Actions
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {actions.map(act => {
          const Icon = act.icon
          return (
            <button
              key={act.label}
              onClick={() => act.href !== '#' && router.push(act.href)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: act.href === '#' ? 'not-allowed' : 'pointer',
                transition: 'all 120ms',
                outline: 'none',
                opacity: act.href === '#' ? 0.7 : 1
              }}
              onMouseEnter={e => {
                if (act.href !== '#') {
                  e.currentTarget.style.borderColor = '#cbd5e1'
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.transform = 'translateX(2px)'
                }
              }}
              onMouseLeave={e => {
                if (act.href !== '#') {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.transform = 'translateX(0)'
                }
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: act.bg,
                color: act.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{act.label}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{act.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
