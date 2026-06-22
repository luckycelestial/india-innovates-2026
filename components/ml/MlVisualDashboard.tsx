'use client'

import React from 'react'
import { ModelType } from './MlModelSelector'
import { PredictionParams } from './MlControlPanel'
import { Gauge, Info, AlertCircle, Sparkles, TrendingUp, Cpu } from 'lucide-react'

interface MlVisualDashboardProps {
  activeModel: ModelType
  params: PredictionParams
  loading: boolean
}

export default function MlVisualDashboard({ activeModel, params, loading }: MlVisualDashboardProps) {
  // Semi-deterministic calculations to simulate complex model inferences
  const computedData = React.useMemo(() => {
    if (activeModel === 'aqi') {
      // AQI formula: baseline + hour effect + humidity effect + temp effect + baseline scale
      const hourEffect = Math.sin((params.hour - 6) * Math.PI / 12) * 45 // peaks in evening
      const tempEffect = (params.temp - 25) * 2.8
      const humidityEffect = (params.humidity - 50) * 0.6
      const baselineEffect = (params.pm25Baseline / 100) * 60
      
      const predictedAqi = Math.max(12, Math.min(480, Math.round(95 + hourEffect + tempEffect + humidityEffect + baselineEffect)))
      
      // Categorize
      let label = 'Good'
      let color = '#10b981'
      let bg = '#ecfdf5'
      let desc = 'Minimal impact on health. Outdoor activities are safe.'
      
      if (predictedAqi > 300) {
        label = 'Severe'
        color = '#7f1d1d'
        bg = '#fef2f2'
        desc = 'Health alert! Severe cardiovascular and respiratory effects.'
      } else if (predictedAqi > 200) {
        label = 'Very Poor'
        color = '#b91c1c'
        bg = '#fef2f2'
        desc = 'Respiratory illness on prolonged exposure.'
      } else if (predictedAqi > 150) {
        label = 'Unhealthy'
        color = '#ef4444'
        bg = '#fff5f5'
        desc = 'Members of sensitive groups may experience health effects.'
      } else if (predictedAqi > 100) {
        label = 'Moderate / Poor'
        color = '#f59e0b'
        bg = '#fffbeb'
        desc = 'Slight discomfort for people with lung/heart diseases.'
      } else if (predictedAqi > 50) {
        label = 'Satisfactory'
        color = '#84cc16'
        bg = '#f7fee7'
        desc = 'Minor breathing discomfort for sensitive people.'
      }

      // Generate 24hr forecast points
      const forecast24h = Array.from({ length: 12 }, (_, i) => {
        const h = i * 2
        const hEff = Math.sin((h - 6) * Math.PI / 12) * 45
        const val = Math.max(12, Math.min(480, Math.round(95 + hEff + tempEffect + humidityEffect + baselineEffect)))
        return { label: `${h}:00`, val }
      })

      return {
        aqi: predictedAqi,
        label,
        color,
        bg,
        desc,
        pm25: Math.round(predictedAqi * 0.45),
        pm10: Math.round(predictedAqi * 0.95),
        features: [
          { name: 'Industrial Baseline', weight: 42 },
          { name: 'Time / Diurnal cycle', weight: 28 },
          { name: 'Ambient Temp', weight: 18 },
          { name: 'Relative Humidity', weight: 12 }
        ],
        forecast: forecast24h
      }
    } else if (activeModel === 'traffic') {
      // Traffic calculations: congestion (0-100)
      const isWeekend = params.dayOfWeek === 'weekend'
      const peakHours = [8, 9, 17, 18, 19]
      const isPeak = peakHours.includes(params.hour)
      
      let congestionBase = 25
      if (isPeak) congestionBase += 50
      if (isWeekend) congestionBase -= 15
      
      if (params.weatherCondition === 'rain') congestionBase += 20
      if (params.weatherCondition === 'fog') congestionBase += 12
      
      // District specific modifiers
      if (params.district === 'Bengaluru Urban') congestionBase += 15
      else if (params.district === 'Mandya') congestionBase -= 10
      
      const congestionScore = Math.max(5, Math.min(99, Math.round(congestionBase)))
      
      let label = 'Smooth Flow'
      let color = '#10b981'
      let speed = Math.round(55 * (1 - congestionScore / 130))
      
      if (congestionScore > 80) {
        label = 'Gridlock / Critical'
        color = '#ef4444'
      } else if (congestionScore > 50) {
        label = 'Heavy Congestion'
        color = '#f59e0b'
      } else if (congestionScore > 30) {
        label = 'Moderate Traffic'
        color = '#3b82f6'
      }

      // Generate 24h speed forecast
      const forecast24h = Array.from({ length: 12 }, (_, i) => {
        const h = i * 2
        const hPeak = peakHours.includes(h)
        let base = 25
        if (hPeak) base += 50
        if (isWeekend) base -= 15
        if (params.weatherCondition === 'rain') base += 20
        const cScore = Math.max(5, Math.min(99, Math.round(base)))
        const spd = Math.round(55 * (1 - cScore / 130))
        return { label: `${h}:00`, val: spd }
      })

      return {
        congestionScore,
        label,
        color,
        speed,
        features: [
          { name: 'Diurnal (Hour) Peak', weight: 52 },
          { name: 'Weather Factor', weight: 22 },
          { name: 'District Density', weight: 16 },
          { name: 'Weekend/Weekday Shift', weight: 10 }
        ],
        forecast: forecast24h
      }
    } else {
      // Grievance volume predictions: base = 10, rain increases sewage/road complaints
      let volumeBase = 12
      if (params.department === 'road') volumeBase += params.rainfall * 1.2
      if (params.department === 'water') volumeBase += params.rainfall * 0.8
      if (params.department === 'sanitation') volumeBase += params.rainfall * 0.5
      
      // backlog adds escalation risk
      const predictedVolume = Math.round(volumeBase + params.backlog / 12)
      
      const escalationProb = Math.max(2, Math.min(98, Math.round((params.backlog * 0.35) + (params.rainfall * 0.25))))
      
      let label = 'Low Alert'
      let color = '#10b981'
      
      if (escalationProb > 75) {
        label = 'Extreme Backlog Risk'
        color = '#ef4444'
      } else if (escalationProb > 45) {
        label = 'Elevated Risk'
        color = '#f59e0b'
      } else if (escalationProb > 20) {
        label = 'Moderate Risk'
        color = '#3b82f6'
      }

      // Generate departmental distributions
      const categories = [
        { name: 'Road Potholes', count: Math.round(predictedVolume * 0.35) },
        { name: 'Sewer Overflow', count: Math.round(predictedVolume * 0.25) },
        { name: 'Power Outage', count: Math.round(predictedVolume * 0.18) },
        { name: 'Sanitation Overflow', count: Math.round(predictedVolume * 0.12) },
        { name: 'Others', count: Math.max(1, Math.round(predictedVolume * 0.1)) }
      ]

      return {
        volume: predictedVolume,
        escalationProb,
        label,
        color,
        categories,
        features: [
          { name: 'Active Backlog Queue', weight: 48 },
          { name: 'Monsoon/Rainfall Intensity', weight: 32 },
          { name: 'Departmental Modifiers', weight: 12 },
          { name: 'Historical Volume', weight: 8 }
        ]
      }
    }
  }, [activeModel, params])

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #dadad3',
        borderRadius: '20px',
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        height: '100%',
        minHeight: '400px'
      }}>
        <div className="ml-loader" style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #e60023',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#e60023', fontWeight: 700 }}>
            <Cpu size={18} className="animate-pulse" />
            <span>CRITICAL INFERENCE ENGINE</span>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Allocating Tensor Core threads &amp; feeding parameters...
          </span>
        </div>
      </div>
    )
  }

  // Render Dashboards based on activeModel
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dadad3',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} style={{ color: '#e60023' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#262622' }}>
            Inference Results Dashboard
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
          Confidence Level: High (95%)
        </span>
      </div>

      {/* RENDER DETAILED AQI METRICS */}
      {activeModel === 'aqi' && computedData.aqi && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Indicators Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Speedometer Gauge */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Predicted AQI
              </span>
              
              {/* Circular Gauge */}
              <div style={{ width: '130px', height: '80px', position: 'relative', marginTop: '10px', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 50">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke={computedData.color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="126"
                    strokeDashoffset={126 - (126 * Math.min(350, computedData.aqi) / 350)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {computedData.aqi}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: computedData.color, marginTop: '2px' }}>
                    {computedData.label}
                  </span>
                </div>
              </div>
            </div>

            {/* PM2.5 / PM10 Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Particulate Matter
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>PM2.5 Conc.</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#e60023' }}>{computedData.pm25} µg/m³</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>PM10 Conc.</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#475569' }}>{computedData.pm10} µg/m³</span>
                </div>
              </div>

              <div style={{
                background: computedData.bg,
                padding: '10px',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#475569',
                borderLeft: `3px solid ${computedData.color}`,
                display: 'flex',
                gap: '6px'
              }}>
                <Info size={14} style={{ color: computedData.color, flexShrink: 0 }} />
                <span>{computedData.desc}</span>
              </div>
            </div>
          </div>

          {/* Predicted 24h Trend Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              Diurnal AQI Forecast Trend (Predicted Next 24 Hours)
            </span>
            <div style={{
              height: '140px',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px 12px 8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '6px',
              background: '#fafafa'
            }}>
              {computedData.forecast?.map((pt, idx) => {
                const heightPercent = Math.max(10, Math.min(100, (pt.val / 300) * 100))
                return (
                  <div key={idx} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{pt.val}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: '18px',
                      height: `${heightPercent}%`,
                      background: `linear-gradient(to top, ${computedData.color}80, ${computedData.color})`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '9px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{pt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER DETAILED TRAFFIC METRICS */}
      {activeModel === 'traffic' && computedData.congestionScore && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Predicted Congestion
              </span>
              <div style={{ fontSize: '38px', fontWeight: 800, color: computedData.color, marginTop: '8px' }}>
                {computedData.congestionScore}%
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                {computedData.label}
              </span>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Predicted Average Speed
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                {computedData.speed}
                <span style={{ fontSize: '14px', color: '#64748b' }}>km/h</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Free Flow Velocity target is 55 km/h. Expected delay factor: {Math.round((55 - (computedData.speed || 0)) / 55 * 100)}% increase in transit time.
              </div>
            </div>
          </div>

          {/* Timeline trend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              Hourly Speed Flow Timeline (Predicted Speed vs. Hour)
            </span>
            <div style={{
              height: '140px',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px 12px 8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '6px',
              background: '#fafafa'
            }}>
              {computedData.forecast?.map((pt, idx) => {
                const heightPercent = Math.max(10, Math.min(100, (pt.val / 55) * 100))
                return (
                  <div key={idx} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{pt.val}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: '18px',
                      height: `${heightPercent}%`,
                      background: `linear-gradient(to top, #3b82f680, #3b82f6)`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '9px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{pt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER DETAILED COMPLAINT VOLUME METRICS */}
      {activeModel === 'complaints' && computedData.volume && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Predicted Grievance Vol.
              </span>
              <div style={{ fontSize: '38px', fontWeight: 800, color: '#e60023', marginTop: '8px' }}>
                {computedData.volume}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                New cases/day predicted
              </span>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Escalation Backlog Risk
              </span>
              <div style={{ fontSize: '38px', fontWeight: 800, color: computedData.color, marginTop: '8px' }}>
                {computedData.escalationProb}%
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                {computedData.label}
              </span>
            </div>
          </div>

          {/* Departmental breakdown prediction */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              Predicted Distribution by Sub-Category
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {computedData.categories?.map((cat, idx) => {
                const total = computedData.categories.reduce((acc, c) => acc + c.count, 0)
                const percentage = Math.round(cat.count / (total || 1) * 100)
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{cat.name}</span>
                      <span style={{ fontWeight: 700, color: '#e60023' }}>{cat.count} cases ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: '#e60023',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* FEATURE IMPORTANCE WEIGHTS BAR */}
      <div style={{ borderTop: '1px solid #dadad3', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} style={{ color: '#e60023' }} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#262622', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Feature Weighting / Shapley Values
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {computedData.features?.map((f, idx) => (
            <div key={idx} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                <span style={{ color: '#475569' }}>{f.name}</span>
                <span style={{ color: '#e60023' }}>{f.weight}%</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${f.weight}%`, background: '#e60023' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
