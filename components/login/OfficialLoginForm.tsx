'use client'

import React, { useState } from 'react'

type OfficialLoginFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>
  loading: boolean
}

export default function OfficialLoginForm({ onSubmit, loading }: OfficialLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    onSubmit(email, password)
  }

  const fillDemo = () => {
    setEmail('admin@nagaragupta.dev')
    setPassword('demo123')
    setError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#000000', marginBottom: '6px' }}>
            Official Email / Username
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="admin@nagaragupta.dev"
            required
            style={{
              width: '100%',
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

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#000000', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            placeholder="••••••••"
            required
            style={{
              width: '100%',
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

        {error && <p style={{ fontSize: '12px', color: '#e60023', marginTop: '4px', fontWeight: 600 }}>{error}</p>}

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
            opacity: loading ? 0.7 : 1,
            marginTop: '8px'
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

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
          Quick Demo Credentials
        </div>
        <button
          type="button"
          onClick={fillDemo}
          style={{
            textAlign: 'left',
            padding: '8px 10px',
            background: '#ffffff',
            border: '1px solid #dadad3',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#000000',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <strong>Admin / Super Admin</strong>
            <div style={{ color: '#262622', fontSize: '10px' }}>admin@nagaragupta.dev</div>
          </div>
        </button>
      </div>
    </div>
  )
}
