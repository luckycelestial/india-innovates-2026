'use client'

import { useState } from 'react'

type ChartData = {
  statusCounts: Record<string, number>
  categoryCounts: Record<string, number>
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted:      { label: 'Submitted',      color: '#64748b' },
  assigned:       { label: 'Assigned',       color: '#3b82f6' },
  in_progress:    { label: 'In Progress',    color: '#d97706' },
  pending_review: { label: 'Pending Review', color: '#8b5cf6' },
  resolved:       { label: 'Resolved',       color: '#10b981' },
  closed:         { label: 'Closed',         color: '#4b5563' },
  escalated:      { label: 'Escalated',      color: '#ef4444' },
}

const CAT_LABEL: Record<string, string> = {
  road: 'Road & Pavement',
  water: 'Water Supply',
  electricity: 'Electricity',
  sanitation: 'Sanitation',
  streetlight: 'Street Lighting',
  drainage: 'Drainage & Logging',
  waste: 'Solid Waste',
  parks: 'Parks & Public',
  noise: 'Noise Pollution',
  other: 'Other',
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function ComplaintTrendChart({ statusCounts, categoryCounts }: ChartData) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null)
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)

  // -- DONUT CHART CALCULATIONS --
  const totalStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  
  let currentAngle = 0
  const donutSlices = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => {
      const percentage = (count / (totalStatus || 1)) * 100
      const angle = (count / (totalStatus || 1)) * 360
      const startAngle = currentAngle
      currentAngle += angle
      return { status, count, percentage, startAngle, angle }
    })

  // Helper for drawing SVG arc
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    }
  }

  const getArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ')
  }

  // -- BAR CHART CALCULATIONS --
  const categories = Object.entries(categoryCounts).map(([cat, count]) => ({
    key: cat,
    label: CAT_LABEL[cat] ?? cat,
    count
  })).sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...categories.map(c => c.count), 1)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '24px',
      marginBottom: '28px',
      fontFamily: FONT_SANS
    }}>
      
      {/* 1. Status Breakdown (Donut Chart) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>
          Grievance Status Breakdown
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* SVG Donut */}
          <div style={{ position: 'relative', width: '180px', height: '180px' }}>
            {totalStatus === 0 ? (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No Data
              </div>
            ) : (
              <svg width="180" height="180" viewBox="0 0 180 180">
                {donutSlices.map(slice => {
                  const meta = STATUS_META[slice.status] ?? { label: slice.status, color: '#94a3b8' }
                  // Special case for single 100% slice to prevent drawing glitch
                  const isFullCircle = slice.angle >= 359.9
                  const path = isFullCircle
                    ? `M 90 40 A 50 50 0 1 0 90.01 40`
                    : getArcPath(90, 90, 50, slice.startAngle, slice.startAngle + slice.angle)
                  
                  const isHovered = hoveredSlice === slice.status
                  
                  return (
                    <path
                      key={slice.status}
                      d={path}
                      fill="none"
                      stroke={meta.color}
                      strokeWidth={isHovered ? 24 : 16}
                      style={{ cursor: 'pointer', transition: 'stroke-width 150ms ease-out' }}
                      onMouseEnter={() => setHoveredSlice(slice.status)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )
                })}
              </svg>
            )}
            
            {/* Center label */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              {hoveredSlice ? (
                <>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    {statusCounts[hoveredSlice]}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    {STATUS_META[hoveredSlice]?.label}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                    {totalStatus}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Total cases
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Legend Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 140px' }}>
            {Object.entries(STATUS_META).map(([status, meta]) => {
              const count = statusCounts[status] || 0
              if (count === 0 && totalStatus > 0) return null
              const isHovered = hoveredSlice === status
              
              return (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: isHovered ? '#0f172a' : '#475569',
                    fontWeight: isHovered ? 700 : 500,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isHovered ? '#f8fafc' : 'transparent',
                    transition: 'all 100ms'
                  }}
                  onMouseEnter={() => setHoveredSlice(status)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: meta.color }} />
                    <span>{meta.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* 2. Category Volume (Bar Chart) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '20px' }}>
          Grievances by Category
        </h3>
        
        {categories.length === 0 ? (
          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No Data
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: '180px',
            paddingTop: '20px',
            borderBottom: '1px solid #e2e8f0',
            position: 'relative'
          }}>
            {categories.slice(0, 7).map(cat => {
              const heightPct = (cat.count / maxCount) * 80 // Max height 80%
              const isHovered = hoveredBar === cat.key
              
              return (
                <div
                  key={cat.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredBar(cat.key)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on top */}
                  <div style={{
                    position: 'absolute',
                    top: `calc(${80 - heightPct}% - 26px)`,
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'scale(1)' : 'scale(0.8)',
                    transition: 'all 120ms ease-out',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    {cat.count}
                  </div>
                  
                  {/* Vertical bar */}
                  <div style={{
                    width: '65%',
                    height: `${heightPct}%`,
                    minHeight: cat.count > 0 ? '4px' : '0px',
                    background: isHovered ? 'linear-gradient(to top, #3b82f6, #60a5fa)' : '#93c5fd',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 200ms ease, background 150ms'
                  }} />
                  
                  {/* X-axis Label */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isHovered ? '#0f172a' : '#64748b',
                    textAlign: 'center',
                    marginTop: '8px',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {cat.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
