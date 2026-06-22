'use client'

import React, { useState } from 'react'

type CitizenLoginFormProps = {
  onSubmit: (aadhaar: string, otp: string) => Promise<void>
  loading: boolean
}

export default function CitizenLoginForm({ onSubmit, loading }: CitizenLoginFormProps) {
  const [aadhaar, setAadhaar] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanAadhaar = aadhaar.replace(/\D/g, '')
    if (cleanAadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.')
      return
    }
    setError('')
    setOtpRequested(true)
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) {
      setError('Enter the 4-digit OTP.')
      return
    }
    onSubmit(aadhaar.replace(/\D/g, ''), otp)
  }

  const fillDemo = () => {
    setAadhaar('999999999999')
    setError('')
    setOtpRequested(true)
    setOtp('0000')
    onSubmit('999999999999', '0000')
  }

  // Format Aadhaar with spaces: 0000 0000 0000
  const formatAadhaar = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 12)
    const matches = clean.match(/\d{1,4}/g)
    return matches ? matches.join(' ') : clean
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!otpRequested ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#000000', marginBottom: '6px' }}>
              Aadhaar Card Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 12px',
                background: '#f6f6f3',
                border: '1px solid #dadad3',
                borderRadius: '16px',
                fontSize: '13px',
                color: '#000000',
                fontWeight: 700
              }}>UIDAI</span>
              <input
                type="text"
                inputMode="numeric"
                value={aadhaar}
                onChange={(e) => {
                  setAadhaar(formatAadhaar(e.target.value))
                  setError('')
                }}
                placeholder="0000 0000 0000"
                maxLength={14} // 12 digits + 2 spaces
                required
                style={{
                  flex: 1,
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '16px',
                  border: '1px solid #dadad3',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#000000',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            {error && <p style={{ fontSize: '12px', color: '#e60023', marginTop: '6px', fontWeight: 600 }}>{error}</p>}
          </div>

          <p style={{ fontSize: '12px', color: '#262622', margin: 0, lineHeight: 1.4 }}>
            Verification OTP will be sent to the mobile number registered with your Aadhaar Card.
          </p>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '42px',
              background: '#e60023',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 150ms',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Sending OTP...' : 'Get OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#000000', marginBottom: '6px' }}>
              Enter One-Time Password (OTP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))
                setError('')
              }}
              placeholder="0 0 0 0"
              maxLength={4}
              required
              autoFocus
              style={{
                width: '100%',
                height: '44px',
                padding: '0 12px',
                borderRadius: '16px',
                border: '1px solid #dadad3',
                fontSize: '18px',
                letterSpacing: '8px',
                textAlign: 'center',
                outline: 'none',
                color: '#000000',
                fontFamily: 'monospace'
              }}
            />
            {error && <p style={{ fontSize: '12px', color: '#e60023', marginTop: '6px', fontWeight: 600 }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#262622' }}>Demo OTP: <strong>0000</strong></span>
            <button
              type="button"
              onClick={() => {
                setOtpRequested(false)
                setOtp('')
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e60023',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Change Aadhaar
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '42px',
              background: '#e60023',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 150ms',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      )}

      <div style={{
        marginTop: '12px',
        padding: '10px 12px',
        borderRadius: '16px',
        background: '#f6f6f3',
        border: '1px solid #dadad3',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Login
        </div>
        <button
          type="button"
          onClick={fillDemo}
          style={{
            textAlign: 'left',
            padding: '6px 8px',
            background: '#ffffff',
            border: '1px solid #dadad3',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#000000',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500
          }}
        >
          💳 Aadhaar: 9999 9999 9999 (OTP: 0000)
        </button>
      </div>
    </div>
  )
}
