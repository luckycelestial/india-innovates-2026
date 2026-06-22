'use client'

import React from 'react'
import { Sliders, HelpCircle } from 'lucide-react'
import { ModelType } from './MlModelSelector'

export interface PredictionParams {
  ward: string
  hour: number
  temp: number
  humidity: number
  pm25Baseline: number
  district: string
  dayOfWeek: 'weekday' | 'weekend'
  weatherCondition: 'clear' | 'rain' | 'fog'
  department: string
  rainfall: number
  backlog: number
}

interface MlControlPanelProps {
  activeModel: ModelType
  params: PredictionParams
  onChange: (updates: Partial<PredictionParams>) => void
  onPredict: () => void
  loading: boolean
}

const DISTRICTS = [
  'All Districts',
  'Bengaluru Urban',
  'Bengaluru Rural',
  'Mysuru',
  'Belagavi',
  'Mangaluru',
  'Mandya',
  'Kalaburagi',
  'Bagalkot',
  'Ramanagara',
  'Ballari',
  'Bidar',
  'Vijayapura',
  'Chamarajanagar',
  'Chikkamagaluru',
  'Chikkaballapura',
  'Chitradurga',
  'Davanagere',
  'Dharwad',
  'Gadag',
  'Hassan',
  'Haveri',
  'Kodagu',
  'Kolar',
  'Koppal',
  'Raichur',
  'Shivamogga',
  'Tumakuru',
  'Udupi',
  'Uttara Kannada',
  'Yadgir'
]

const WARDS = [
  'All Wards',
  'Hebbal',
  'Jayanagar',
  'Whitefield',
  'Peenya',
  'Koramangala',
  'Indiranagar',
  'Malleshwaram'
]

const DEPARTMENTS = [
  { id: 'road', name: 'Roads & Infrastructure' },
  { id: 'water', name: 'Water Supply & Sewerage' },
  { id: 'electricity', name: 'BESCOM Electricity' },
  { id: 'sanitation', name: 'Sanitation & Health' },
  { id: 'waste', name: 'Solid Waste Management' }
]

export default function MlControlPanel({
  activeModel,
  params,
  onChange,
  onPredict,
  loading
}: MlControlPanelProps) {

  const handleSliderChange = (key: keyof PredictionParams, val: number) => {
    onChange({ [key]: val })
  }

  const handleSelectChange = (key: keyof PredictionParams, val: string) => {
    onChange({ [key]: val })
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #dadad3',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={20} style={{ color: '#e60023' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#262622' }}>
            Model Hyperparameters
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: '#64748b', background: '#f4f4f5', padding: '2px 8px', borderRadius: '12px' }}>
          Live Inference
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '260px' }}>
        {/* AQI CONTROLS */}
        {activeModel === 'aqi' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Select Target Ward</label>
              <select
                value={params.ward}
                onChange={e => handleSelectChange('ward', e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Hour of Day</span>
                <span style={{ color: '#e60023' }}>{params.hour.toString().padStart(2, '0')}:00 hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                value={params.hour}
                onChange={e => handleSliderChange('hour', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Ambient Temperature</span>
                <span style={{ color: '#e60023' }}>{params.temp}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                value={params.temp}
                onChange={e => handleSliderChange('temp', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Relative Humidity</span>
                <span style={{ color: '#e60023' }}>{params.humidity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={params.humidity}
                onChange={e => handleSliderChange('humidity', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Industrial Activity Baseline</span>
                <span style={{ color: '#e60023' }}>{params.pm25Baseline >= 0 ? `+${params.pm25Baseline}` : params.pm25Baseline}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                value={params.pm25Baseline}
                onChange={e => handleSliderChange('pm25Baseline', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>
          </>
        )}

        {/* TRAFFIC CONTROLS */}
        {activeModel === 'traffic' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Select Target District</label>
              <select
                value={params.district}
                onChange={e => handleSelectChange('district', e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Day of Week</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['weekday', 'weekend'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => handleSelectChange('dayOfWeek', type)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: params.dayOfWeek === type ? '1.5px solid #e60023' : '1px solid #dadad3',
                      background: params.dayOfWeek === type ? '#fdf2f2' : '#ffffff',
                      color: params.dayOfWeek === type ? '#e60023' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Hour of Day</span>
                <span style={{ color: '#e60023' }}>{params.hour.toString().padStart(2, '0')}:00 hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                value={params.hour}
                onChange={e => handleSliderChange('hour', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Weather Condition</label>
              <select
                value={params.weatherCondition}
                onChange={e => handleSelectChange('weatherCondition', e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="clear">☀️ Clear Weather</option>
                <option value="rain">🌧️ Heavy Monsoon Rain</option>
                <option value="fog">🌫️ Dense Morning Fog</option>
              </select>
            </div>
          </>
        )}

        {/* COMPLAINTS CONTROLS */}
        {activeModel === 'complaints' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Select Target District</label>
              <select
                value={params.district}
                onChange={e => handleSelectChange('district', e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Department</label>
              <select
                value={params.department}
                onChange={e => handleSelectChange('department', e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #dadad3',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Forecasted Daily Rainfall</span>
                <span style={{ color: '#e60023' }}>{params.rainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.rainfall}
                onChange={e => handleSliderChange('rainfall', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                <span>Current Department Backlog</span>
                <span style={{ color: '#e60023' }}>{params.backlog} issues</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={params.backlog}
                onChange={e => handleSliderChange('backlog', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#e60023' }}
              />
            </div>
          </>
        )}
      </div>

      <button
        onClick={onPredict}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 20px',
          borderRadius: '12px',
          background: '#e60023',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 14px rgba(230,0,35,0.2)',
          transition: 'all 150ms',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={e => {
          if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          if (!loading) e.currentTarget.style.transform = 'none'
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: '16px',
              height: '16px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Computing Predictions...</span>
          </>
        ) : (
          <span>Run Model Inference</span>
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  )
}
