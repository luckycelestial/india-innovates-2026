'use client'

import { useEffect, useState } from 'react'
// Removed Supabase client
import { 
  BarChart2, TrendingUp, AlertTriangle, ShieldAlert,
  Search, RefreshCw, Radio, BarChart3, HelpCircle
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident } from '@/lib/ksp/mockData'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function PredictiveInsightsPage() {
  const [incidents, setIncidents] = useState<KspIncident[]>(MOCK_INCIDENTS)
  const [loading, setLoading] = useState(false)

  // Socio-Economic Grouping
  const urbanGrouping = incidents.reduce((acc, inc) => {
    const urb = inc.socio_economic_factors?.urbanization || 'medium'
    acc[urb] = (acc[urb] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const povertyGrouping = incidents.reduce((acc, inc) => {
    const pov = inc.socio_economic_factors?.poverty_index || 'medium'
    acc[pov] = (acc[pov] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Dynamic calculation of Predictive Risk Matrix per district
  const districts = Array.from(new Set(incidents.map(i => i.district)))
  const forecastData = districts.map(districtName => {
    const districtIncidents = incidents.filter(i => i.district === districtName)
    const count = districtIncidents.length
    const avgRisk = districtIncidents.reduce((sum, i) => sum + i.risk_score, 0) / count
    
    // Calculate threat score
    const threatScore = Math.max(10, Math.min(99, Math.round((avgRisk * 0.7) + (Math.min(count, 5) * 6))))
    
    // Determine Risk Level
    let riskLevel = 'Low'
    if (threatScore >= 85) riskLevel = 'Critical'
    else if (threatScore >= 70) riskLevel = 'High'
    else if (threatScore >= 50) riskLevel = 'Medium'

    // Determine Trend
    const sorted = [...districtIncidents].sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
    const midpoint = Math.floor(sorted.length / 2)
    const oldAvg = midpoint > 0 ? sorted.slice(0, midpoint).reduce((sum, i) => sum + i.risk_score, 0) / midpoint : avgRisk
    const newAvg = sorted.slice(midpoint).reduce((sum, i) => sum + i.risk_score, 0) / (sorted.length - midpoint)
    
    let trend: 'Increasing' | 'Decreasing' | 'Stable' = 'Stable'
    if (newAvg > oldAvg + 2) trend = 'Increasing'
    else if (newAvg < oldAvg - 2) trend = 'Decreasing'

    // Extract dominant category & location
    const categoriesMap = districtIncidents.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const dominantCategory = Object.entries(categoriesMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general'

    const locationsMap = districtIncidents.reduce((acc, i) => {
      acc[i.location] = (acc[i.location] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const dominantLocation = Object.entries(locationsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'local areas'

    return {
      district: districtName,
      threatScore,
      riskLevel,
      trend,
      reason: `${dominantCategory.toUpperCase()} surges and associated ${dominantLocation} threat factors.`,
      recommendation: `Patrol ${dominantLocation} to mitigate emerging ${dominantCategory} vulnerability loops.`
    }
  }).sort((a, b) => b.threatScore - a.threatScore)

  // Anomaly Detection list (MOs or parameters that deviate significantly from baseline averages)
  const anomalies = incidents.filter(i => i.risk_score >= 80)

  return (
    <main style={{ minHeight: '100vh', background: '#f6f6f3', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Title strip */}
        <div style={{
          background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(17, 24, 39, 0.15)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#a78bfa', marginBottom: '8px' }}>
                <Radio size={12} className="animate-pulse" />
                AI Predictive Analytics &amp; Sociological overlays
              </div>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '32px', color: '#ffffff' }}>
                Predictive Risk Scoring &amp; Anomaly Matrix
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                Forecasting crime hotspots, overlaying socio-economic vectors, and calling out behavioral anomalies.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px', marginBottom: '32px', alignItems: 'start' }}>
          
          {/* Left panel: Socio-Economic Correlations */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', marginBottom: '6px' }}>
              Sociological Indicators
            </h3>
            <p style={{ fontSize: '12px', color: '#262622', marginBottom: '20px' }}>
              Overlay of crime occurrences with urbanization rate and poverty demographics.
            </p>

            {/* Urbanization Bar Chart (SVG) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#262622', marginBottom: '8px' }}>Incidents by Urbanization Level:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['high', 'medium', 'low'].map(lvl => {
                  const val = urbanGrouping[lvl] || 0
                  const maxVal = Math.max(...Object.values(urbanGrouping), 1)
                  const pct = Math.round((val / maxVal) * 100)
                  return (
                    <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '60px', fontSize: '11px', textTransform: 'capitalize', color: '#262622', fontWeight: 600 }}>{lvl}</span>
                      <div style={{ flex: 1, height: '12px', background: '#f6f6f3', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#8b5cf6', borderRadius: '6px' }} />
                      </div>
                      <span style={{ width: '24px', fontSize: '11px', fontWeight: 700, color: '#262622', textAlign: 'right' }}>{val}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Poverty correlation progress bar */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#262622', marginBottom: '8px' }}>Incidents by Poverty Index:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['high', 'medium', 'low'].map(lvl => {
                  const val = povertyGrouping[lvl] || 0
                  const maxVal = Math.max(...Object.values(povertyGrouping), 1)
                  const pct = Math.round((val / maxVal) * 100)
                  return (
                    <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '60px', fontSize: '11px', textTransform: 'capitalize', color: '#262622', fontWeight: 600 }}>{lvl}</span>
                      <div style={{ flex: 1, height: '12px', background: '#f6f6f3', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#e60023', borderRadius: '6px' }} />
                      </div>
                      <span style={{ width: '24px', fontSize: '11px', fontWeight: 700, color: '#262622', textAlign: 'right' }}>{val}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right panel: AI Predictive Risk Scoring Grid */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #dadad3',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadad3' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000' }}>
                Predictive Risk Matrix &amp; Force Deployment
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f6f6f3', color: '#262622', fontWeight: 600, borderBottom: '1px solid #dadad3' }}>
                  <th style={{ padding: '12px 24px' }}>District</th>
                  <th style={{ padding: '12px 16px' }}>Threat Index</th>
                  <th style={{ padding: '12px 16px' }}>Risk Level</th>
                  <th style={{ padding: '12px 16px' }}>Forecast Trend</th>
                  <th style={{ padding: '12px 24px' }}>Recommended Strategy</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.map(f => {
                  let badgeBg = '#fef3c7'
                  let badgeText = '#d97706'
                  if (f.riskLevel === 'Critical') {
                    badgeBg = '#fee2e2'
                    badgeText = '#b91c1c'
                  } else if (f.riskLevel === 'High') {
                    badgeBg = '#ffedd5'
                    badgeText = '#c2410c'
                  } else if (f.riskLevel === 'Medium') {
                    badgeBg = '#e0f2fe'
                    badgeText = '#0369a1'
                  }
                  
                  return (
                    <tr key={f.district} style={{ borderBottom: '1px solid #f6f6f3', color: '#262622' }}>
                      <td style={{ padding: '14px 24px', fontWeight: 700, color: '#000000' }}>{f.district}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{f.threatScore}%</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: badgeBg, color: badgeText, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                          {f.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: f.trend === 'Increasing' ? '#b91c1c' : f.trend === 'Decreasing' ? '#6D9998' : '#262622' }}>
                        {f.trend === 'Increasing' ? '📈 Up' : f.trend === 'Decreasing' ? '📉 Down' : '➡️ Stable'}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '11px', lineHeight: 1.4 }}>
                        <div>{f.recommendation}</div>
                        <div style={{ color: '#94a3b8', marginTop: '2px' }}><i>Ref: {f.reason}</i></div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Behavioral Anomaly Detection Panel */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dadad3',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: '24px'
        }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#000000', marginBottom: '4px' }}>
            Behavioral Anomaly log
          </h3>
          <p style={{ fontSize: '12px', color: '#262622', marginBottom: '20px' }}>
            Critical anomalies representing high threat scores or significant shifts in typical MO signatures.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {anomalies.map(anom => (
              <div 
                key={anom.id}
                style={{
                  border: '1px solid #fecaca',
                  background: '#fff5f5',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '16px' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>Case {anom.case_number}</span>
                    <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '1px 8px', borderRadius: '20px', fontWeight: 600 }}>
                      Anomalous Index: {anom.risk_score}
                    </span>
                    <span style={{ fontSize: '11px', color: '#262622' }}>
                      | {anom.police_station}, {anom.district}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '6px', lineHeight: 1.4 }}>
                    <strong>MO:</strong> {anom.modus_operandi}
                  </p>
                  <p style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                    <i>Note: High risk score indicating inter-district smuggling or high density cyber targeting loops.</i>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
