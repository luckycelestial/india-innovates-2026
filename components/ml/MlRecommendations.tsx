'use client'

import React from 'react'
import { ModelType } from './MlModelSelector'
import { PredictionParams } from './MlControlPanel'
import { ShieldAlert, Award, FileText, CheckCircle2, Send } from 'lucide-react'

interface MlRecommendationsProps {
  activeModel: ModelType
  params: PredictionParams
}

export default function MlRecommendations({ activeModel, params }: MlRecommendationsProps) {
  // Deterministic checks matching the calculations in visual dashboard
  const recommendations = React.useMemo(() => {
    const list = []
    
    if (activeModel === 'aqi') {
      const peakHours = [8, 9, 17, 18, 19]
      const hourEffect = Math.sin((params.hour - 6) * Math.PI / 12) * 45
      const tempEffect = (params.temp - 25) * 2.8
      const humidityEffect = (params.humidity - 50) * 0.6
      const baselineEffect = (params.pm25Baseline / 100) * 60
      const predictedAqi = Math.max(12, Math.min(480, Math.round(95 + hourEffect + tempEffect + humidityEffect + baselineEffect)))

      if (predictedAqi > 200) {
        list.push({
          type: 'danger',
          title: 'Construction & Dust Restriction',
          desc: `AQI predicted at ${predictedAqi} (Very Poor) in ${params.ward}. Issue mandatory dust mitigation orders and restrict heavy vehicle movement.`
        })
        list.push({
          type: 'warning',
          title: 'Public Health Advisory',
          desc: 'Trigger automatic citizen broadcasts recommending indoor stays, masking, and high-filtration air usage.'
        })
      } else if (predictedAqi > 100) {
        list.push({
          type: 'warning',
          title: 'Deploy Mist Cannons & Sweepers',
          desc: `Moderate air pollution levels predicted in ${params.ward}. Deploy misting cannons at major construction hubs.`
        })
      } else {
        list.push({
          type: 'success',
          title: 'Air Quality Safe Zone',
          desc: `Predicted AQI is satisfactory (${predictedAqi}) for ${params.ward}. No restrictions needed. Continuing passive sensor grid monitoring.`
        })
      }
    } else if (activeModel === 'traffic') {
      const peakHours = [8, 9, 17, 18, 19]
      const isPeak = peakHours.includes(params.hour)
      const isWeekend = params.dayOfWeek === 'weekend'
      
      let congestionBase = 25
      if (isPeak) congestionBase += 50
      if (isWeekend) congestionBase -= 15
      if (params.weatherCondition === 'rain') congestionBase += 20
      if (params.weatherCondition === 'fog') congestionBase += 12
      if (params.district === 'Bengaluru Urban') congestionBase += 15
      else if (params.district === 'Mandya') congestionBase -= 10
      
      const congestionScore = Math.max(5, Math.min(99, Math.round(congestionBase)))

      if (congestionScore > 75) {
        list.push({
          type: 'danger',
          title: 'Adaptive Traffic Signal Modulation',
          desc: `Critical congestion (${congestionScore}%) predicted in ${params.district}. Dynamic signal systems should adjust green-cycle times to support high-throughput directions.`
        })
        list.push({
          type: 'warning',
          title: 'Traffic Marshal Deployment',
          desc: `Deploy additional road wardens to major junctions. Traffic speed predicted to drop to ${Math.round(55 * (1 - congestionScore / 130))} km/h.`
        })
      } else if (params.weatherCondition === 'rain') {
        list.push({
          type: 'warning',
          title: 'Monsoon Hazard Warning',
          desc: 'High risk of waterlogging delays. Broadcast alerts to commuters regarding alternative routes.'
        })
      } else {
        list.push({
          type: 'success',
          title: 'Normal Traffic Flow',
          desc: `Congestion score predicted at ${congestionScore}% (Smooth flow). All arterial corridors operating within design tolerances.`
        })
      }
    } else {
      // Complaints
      const escalationProb = Math.max(2, Math.min(98, Math.round((params.backlog * 0.35) + (params.rainfall * 0.25))))

      if (escalationProb > 65) {
        list.push({
          type: 'danger',
          title: 'Trigger Auto-Escalation Protocol',
          desc: `High backlog queue (${params.backlog} issues) combined with weather risks represents an escalation risk of ${escalationProb}%. Reallocate staff to clear older issues.`
        })
        list.push({
          type: 'warning',
          title: 'Cross-Department Coordination',
          desc: 'Flag critical backlog items for review by the zonal deputy commissioner.'
        })
      } else if (params.rainfall > 40) {
        list.push({
          type: 'warning',
          title: 'Pre-emptive Drainage Inspections',
          desc: `Daily rainfall forecast is high (${params.rainfall} mm). Task sanitation teams to inspect drainage networks pre-emptively.`
        })
      } else {
        list.push({
          type: 'success',
          title: 'Grievance SLA Safe',
          desc: `Backlog queue is within manageable limits. Service Level Agreements are secure for all departments. Backlog risk is ${escalationProb}%.`
        })
      }
    }

    return list
  }, [activeModel, params])

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dadad3',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldAlert size={20} style={{ color: '#e60023' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#262622' }}>
          AI Recommendation Directives
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recommendations.map((rec, idx) => {
          let borderCol = '#dadad3'
          let bgCol = '#fafafa'
          let titleCol = '#1e293b'
          let icon = <FileText size={18} style={{ color: '#64748b' }} />

          if (rec.type === 'danger') {
            borderCol = '#fecaca'
            bgCol = '#fff5f5'
            titleCol = '#991b1b'
            icon = <ShieldAlert size={18} style={{ color: '#dc2626' }} />
          } else if (rec.type === 'warning') {
            borderCol = '#fef3c7'
            bgCol = '#fffbeb'
            titleCol = '#92400e'
            icon = <ShieldAlert size={18} style={{ color: '#d97706' }} />
          } else if (rec.type === 'success') {
            borderCol = '#bbf7d0'
            bgCol = '#f0fdf4'
            titleCol = '#166534'
            icon = <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
          }

          return (
            <div
              key={idx}
              style={{
                background: bgCol,
                border: `1px solid ${borderCol}`,
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                transition: 'all 150ms'
              }}
            >
              <div style={{ marginTop: '2px' }}>{icon}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: titleCol }}>
                  {rec.title}
                </span>
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  {rec.desc}
                </span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button style={{
                    background: '#ffffff',
                    border: `1px solid ${borderCol}`,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: titleCol,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 150ms'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  >
                    <Send size={10} />
                    <span>Issue Dispatch Directive</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
