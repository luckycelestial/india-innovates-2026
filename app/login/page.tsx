'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// Removed DB client
import AuthShell from '@/components/layout/AuthShell'
import RoleToggle from '@/components/login/RoleToggle'
import CitizenLoginForm from '@/components/login/CitizenLoginForm'
import OfficialLoginForm from '@/components/login/OfficialLoginForm'

type Step = 'form' | 'success'

export default function LoginPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<'citizen' | 'official'>('citizen')
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [targetRoute, setTargetRoute] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleCitizenSubmit = async (aadhaar: string, otp: string) => {
    if (otp !== '0000') {
      alert('Incorrect OTP for demo. Use 0000.')
      return
    }
    setLoading(true)

    // Local demo mode bypassed DB

    setTimeout(() => {
      setLoading(false)
      setSuccessMessage('Citizen identity verified.')
      setTargetRoute('/citizen/home')
      setStep('success')
      if (typeof document !== 'undefined') {
        document.cookie = "user_role=citizen; path=/; max-age=86400";
      }
      setTimeout(() => {
        router.push('/citizen/home')
      }, 1200)
    }, 800)
  }

  const handleOfficialSubmit = async (email: string, password: string) => {
    if (password !== 'demo123') {
      alert('Incorrect password for demo. Use demo123.')
      return
    }
    setLoading(true)

    // Local demo mode bypassed DB

    setTimeout(() => {
      setLoading(false)
      setSuccessMessage('Welcome back, Government Official.')
      setTargetRoute('/official/dashboard')
      setStep('success')
      if (typeof document !== 'undefined') {
        document.cookie = "user_role=official; path=/; max-age=86400";
      }
      setTimeout(() => {
        router.push('/official/dashboard')
      }, 1200)
    }, 800)
  }

  return (
    <AuthShell>
      {step === 'form' ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{
              fontWeight: 800,
              fontSize: '20px',
              color: '#040406',
              margin: '0 0 4px 0'
            }}>
              Sign In
            </h2>
            <p style={{ fontSize: '13px', color: '#36375D', margin: 0 }}>
              Select your access method below to continue.
            </p>
          </div>

          <RoleToggle activeRole={activeRole} onChange={setActiveRole} />

          {activeRole === 'citizen' ? (
            <CitizenLoginForm onSubmit={handleCitizenSubmit} loading={loading} />
          ) : (
            <OfficialLoginForm onSubmit={handleOfficialSubmit} loading={loading} />
          )}
        </>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          textAlign: 'center',
          padding: '24px 0'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(8, 32, 166, 0.06)',
            border: '2px solid #0820A6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: '#0820A6'
          }}>
            ✓
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '20px', color: '#040406', margin: 0 }}>
            Verified
          </h2>
          <p style={{ fontSize: '14px', color: '#36375D', margin: 0 }}>
            {successMessage}
          </p>
          <div style={{
            width: '48px',
            height: '3px',
            borderRadius: '2px',
            background: '#C4BEC6',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              background: '#0820A6',
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              animation: 'progress 1.2s ease forwards'
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </AuthShell>
  )
}
