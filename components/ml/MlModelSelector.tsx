'use client'

import React from 'react'
import { Brain, Wind, Car, BarChart2 } from 'lucide-react'

export type ModelType = 'aqi' | 'traffic' | 'complaints'

interface ModelSelectorProps {
  activeModel: ModelType
  onChange: (model: ModelType) => void
}

export default function MlModelSelector({ activeModel, onChange }: ModelSelectorProps) {
  const models = [
    {
      id: 'aqi' as ModelType,
      title: 'AQI & Air Quality',
      icon: Wind,
      desc: 'Predict PM2.5/PM10 levels & air index',
      accuracy: '94.2% Acc.',
      algorithm: 'Random Forest Regressor'
    },
    {
      id: 'traffic' as ModelType,
      title: 'Traffic & Congestion',
      icon: Car,
      desc: 'Predict travel speed & bottlenecks',
      accuracy: '91.8% Acc.',
      algorithm: 'XGBoost Regressor'
    },
    {
      id: 'complaints' as ModelType,
      title: 'Civic Grievances',
      icon: BarChart2,
      desc: 'Predict escalation risks & daily volume',
      accuracy: '88.5% Acc.',
      algorithm: 'LightGBM Classifier'
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Brain size={24} style={{ color: '#e60023' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#262622' }}>
          Select Predictive Model
        </h2>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {models.map(m => {
          const Icon = m.icon
          const isActive = activeModel === m.id
          
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                background: isActive ? '#fdf2f2' : '#ffffff',
                border: isActive ? '2px solid #e60023' : '1px solid #dadad3',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 200ms ease-in-out',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                boxShadow: isActive ? '0 4px 12px rgba(230, 0, 35, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                outline: 'none'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.border = '1px solid #e60023'
                  e.currentTarget.style.background = '#fcfcfc'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.border = '1px solid #dadad3'
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              <div style={{
                background: isActive ? '#e60023' : '#f4f4f5',
                color: isActive ? '#ffffff' : '#64748b',
                padding: '10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={22} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: isActive ? '#e60023' : '#262622' }}>
                    {m.title}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isActive ? '#e60023' : '#16a34a',
                    background: isActive ? 'rgba(230, 0, 35, 0.1)' : '#f0fdf4',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {m.accuracy}
                  </span>
                </div>
                
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.desc}
                </span>
                
                <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                  Engine: {m.algorithm}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
