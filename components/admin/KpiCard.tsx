import React from 'react'

type KpiCardProps = {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  accentColor: string
  bgColor: string
}

const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function KpiCard({ title, value, subtitle, icon, accentColor, bgColor }: KpiCardProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '22px 24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        <span style={{
          padding: '6px',
          borderRadius: '8px',
          background: bgColor,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: '#0f172a', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
        {subtitle}
      </div>
    </div>
  )
}
