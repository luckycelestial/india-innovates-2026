'use client'

import React, { useState } from 'react'
import { Brain, Cpu, TrendingUp, Sparkles } from 'lucide-react'
import MlModelSelector, { ModelType } from '@/components/ml/MlModelSelector'
import MlControlPanel, { PredictionParams } from '@/components/ml/MlControlPanel'
import MlVisualDashboard from '@/components/ml/MlVisualDashboard'
import MlRecommendations from '@/components/ml/MlRecommendations'
import MlHeatmapDashboard from '@/components/ml/MlHeatmapDashboard'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = 'var(--font-display), "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function MlPredictorPage() {
  const [activeModel, setActiveModel] = useState<ModelType>('aqi')
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<PredictionParams>({
    ward: 'All Wards',
    hour: 14,
    temp: 28,
    humidity: 45,
    pm25Baseline: 15,
    district: 'All Districts',
    dayOfWeek: 'weekday',
    weatherCondition: 'clear',
    department: 'road',
    rainfall: 10,
    backlog: 45
  })

  const handleParamChange = (updates: Partial<PredictionParams>) => {
    setParams(prev => ({ ...prev, ...updates }))
  }

  const handlePredict = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1200)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '28px 32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
        marginBottom: '24px'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(230, 0, 35, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.08)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#e60023', marginBottom: '12px' }}>
              <Cpu size={12} className="animate-pulse" />
              Nagaragupta AI Lab
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '38px', lineHeight: 1.1, color: '#ffffff' }}>
              Civic Predictive Modeler
            </h1>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#94a3b8', marginTop: '6px', fontWeight: 400 }}>
              Live machine learning regressions predicting air pollution indexes, traffic velocities, and grievance volumes.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Model Select & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #dadad3',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
          }}>
            <MlModelSelector activeModel={activeModel} onChange={setActiveModel} />
          </div>
          
          <MlControlPanel
            activeModel={activeModel}
            params={params}
            onChange={handleParamChange}
            onPredict={handlePredict}
            loading={loading}
          />
        </div>

        {/* Right Column: Visual Dashboards & Recommendation Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <MlHeatmapDashboard activeModel={activeModel} params={params} loading={loading} />
          
          <MlVisualDashboard activeModel={activeModel} params={params} loading={loading} />
          
          <MlRecommendations activeModel={activeModel} params={params} />
        </div>
      </div>
    </main>
  )
}
