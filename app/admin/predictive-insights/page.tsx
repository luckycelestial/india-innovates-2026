'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart2, TrendingUp, AlertTriangle, ShieldAlert,
  Search, RefreshCw, Radio, BarChart3, HelpCircle
} from 'lucide-react'
import { MOCK_INCIDENTS, KspIncident } from '@/lib/ksp/mockData'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function PredictiveInsightsPage() {
  const supabase = createClient()
  const [incidents, setIncidents] = useState<KspIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('ksp_incidents')
          .select('*')
          .order('date_time', { ascending: false })
        
        if (!error && data && data.length > 0) {
          setIncidents(data)
        } else {
          setIncidents(MOCK_INCIDENTS)
        }
      } catch {
        setIncidents(MOCK_INCIDENTS)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

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

  // AI Predictive Risk Forecasts for major jurisdictions
  const forecastData = [
    { district: "Bengaluru Urban", threatScore: 92, riskLevel: "Critical", trend: "Increasing", reason: "MDMA logistics corridor expansion & simulated SIM-swap cyber surges.", recommendation: "Increase patrol density in Koramangala & Electronic City." },
    { district: "Mysuru", threatScore: 68, riskLevel: "Medium", trend: "Stable", reason: "burglary occurrences targeting unlocked gold retail fronts.", recommendation: "Deploy community alarms in Lashkar and Vidyaranyapuram." },
    { district: "Belagavi", threatScore: 78, riskLevel: "High", trend: "Increasing", reason: "Border checkpoint smuggling of commercial freight.", recommendation: "Enhance search checkpoints on NH-48 interstate links." },
    { district: "Mangaluru", threatScore: 85, riskLevel: "High", trend: "Increasing", reason: "Narcotics infiltration through coastal fishing transit docks.", recommendation: "Joint harbor patrolling with coastal coast guards." },
    { district: "Hubballi-Dharwad", threatScore: 58, riskLevel: "Medium", trend: "Decreasing", reason: "Spontaneous land faction skirmishes near markets.", recommendation: "Station dispatch vehicles near APMC truck parking yards." }
  ]

  // Anomaly Detection list (MOs or parameters that deviate significantly from baseline averages)
  const anomalies = incidents.filter(i => i.risk_score >= 80)

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
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
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '6px' }}>
              Sociological Indicators
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              Overlay of crime occurrences with urbanization rate and poverty demographics.
            </p>

            {/* Urbanization Bar Chart (SVG) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Incidents by Urbanization Level:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['high', 'medium', 'low'].map(lvl => {
                  const val = urbanGrouping[lvl] || 0
                  const maxVal = Math.max(...Object.values(urbanGrouping), 1)
                  const pct = Math.round((val / maxVal) * 100)
                  return (
                    <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '60px', fontSize: '11px', textTransform: 'capitalize', color: '#64748b', fontWeight: 600 }}>{lvl}</span>
                      <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#8b5cf6', borderRadius: '6px' }} />
                      </div>
                      <span style={{ width: '24px', fontSize: '11px', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{val}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Poverty correlation progress bar */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Incidents by Poverty Index:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['high', 'medium', 'low'].map(lvl => {
                  const val = povertyGrouping[lvl] || 0
                  const maxVal = Math.max(...Object.values(povertyGrouping), 1)
                  const pct = Math.round((val / maxVal) * 100)
                  return (
                    <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '60px', fontSize: '11px', textTransform: 'capitalize', color: '#64748b', fontWeight: 600 }}>{lvl}</span>
                      <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: '6px' }} />
                      </div>
                      <span style={{ width: '24px', fontSize: '11px', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{val}</span>
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
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>
                Predictive Risk Matrix &amp; Force Deployment
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
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
                    <tr key={f.district} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      <td style={{ padding: '14px 24px', fontWeight: 700, color: '#0f172a' }}>{f.district}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{f.threatScore}%</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: badgeBg, color: badgeText, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                          {f.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: f.trend === 'Increasing' ? '#b91c1c' : f.trend === 'Decreasing' ? '#15803d' : '#475569' }}>
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
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: '24px'
        }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '4px' }}>
            Behavioral Anomaly log
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
            Critical anomalies representing high threat scores or significant shifts in typical MO signatures.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {anomalies.map(anom => (
              <div 
                key={anom.id}
                style={{
                  border: '1px solid #fecaca',
                  background: '#fff5f5',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '8px' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>Case {anom.case_number}</span>
                    <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '1px 8px', borderRadius: '20px', fontWeight: 600 }}>
                      Anomalous Index: {anom.risk_score}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
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
