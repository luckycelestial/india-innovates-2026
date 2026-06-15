'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// Demo Aadhaar numbers mapped to roles
const DEMO_ACCOUNTS = [
  {
    id: 'admin',
    label: 'KSP Analyst',
    aadhaar: '9876 5432 1003',
    rawAadhaar: '987654321003',
    name: 'Ramesh Babu',
    description: 'Karnataka State Police Crime Intelligence Platform',
    icon: '👮',
    route: '/admin/crime-intelligence',
    accent: '#0F172A',
    accentBg: 'rgba(15,23,42,0.06)',
    accentBorder: 'rgba(15,23,42,0.15)',
  },
]

const DEMO_OTP = '123456'

function formatAadhaar(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(' ')
  )
}

function maskAadhaar(aadhaar: string) {
  const digits = aadhaar.replace(/\s/g, '')
  return 'XXXX XXXX ' + digits.slice(-4)
}

type Step = 'entry' | 'otp' | 'success'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('entry')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [aadhaarInput, setAadhaarInput] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [aadhaarError, setAadhaarError] = useState('')
  const [loading, setLoading] = useState(false)

  const activeAccount = DEMO_ACCOUNTS.find(a => a.id === selectedRole) ?? null

  const handleRoleSelect = (id: string) => {
    const acc = DEMO_ACCOUNTS.find(a => a.id === id)!
    setSelectedRole(id)
    setAadhaarInput(acc.aadhaar)
    setAadhaarError('')
    setOtpError('')
  }

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAadhaarInput(formatAadhaar(e.target.value))
    setAadhaarError('')
  }

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault()
    const rawInput = aadhaarInput.replace(/\s/g, '')

    if (rawInput.length !== 12) {
      setAadhaarError('Enter a valid 12-digit Aadhaar number.')
      return
    }

    const matched = DEMO_ACCOUNTS.find(a => a.rawAadhaar === rawInput)
    if (!matched) {
      setAadhaarError('This Aadhaar is not registered in the demo. Use one from the cards above.')
      return
    }

    setSelectedRole(matched.id)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep('otp')
    }, 900)
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp !== DEMO_OTP) {
      setOtpError('Incorrect OTP. Use 123456 for this demo.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const email = `${selectedRole}@praja.demo`
    await supabase.auth.signInWithPassword({
      email,
      password: 'PrajaDemo2026!'
    })
    setLoading(false)
    setStep('success')
    setTimeout(() => {
      router.push(activeAccount!.route)
    }, 1200)
  }

  const handleQuickAccess = async (id: string) => {
    const acc = DEMO_ACCOUNTS.find(a => a.id === id)!
    setSelectedRole(id)
    setAadhaarInput(acc.aadhaar)
    setLoading(true)
    const supabase = createClient()
    const email = `${id}@praja.demo`
    await supabase.auth.signInWithPassword({
      email,
      password: 'PrajaDemo2026!'
    })
    setLoading(false)
    router.push(acc.route)
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--color-cloud)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px', fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        width: '100%', maxWidth: '1040px',
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
        gap: '48px', alignItems: 'center',
      }}>

        {/* ── Left: Branding ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Image src="/logo-square.jpg" alt="PRAJA" width={56} height={56} style={{ borderRadius: '8px', objectFit: 'cover' }} priority />
          </Link>

          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '34px', lineHeight: 1.15, color: 'var(--color-ink)', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Secure Aadhaar<br />
              <span style={{ color: 'var(--color-primary)' }}>demo access.</span>
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--color-charcoal)', lineHeight: 1.7, maxWidth: '380px' }}>
              Use a demo Aadhaar below to enter any portal. OTP is simulated for presentation — no real Aadhaar data is used.
            </p>
          </div>

          {/* Demo accounts table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-charcoal)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
              Demo credentials
            </p>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.id}
                id={`role-card-${acc.id}`}
                onClick={() => handleRoleSelect(acc.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                  border: selectedRole === acc.id ? `2px solid ${acc.accent}` : '2px solid var(--color-hairline)',
                  background: selectedRole === acc.id ? acc.accentBg : 'var(--color-canvas)',
                  cursor: 'pointer', transition: 'all 160ms ease', width: '100%',
                  boxShadow: selectedRole === acc.id ? `0 0 0 3px ${acc.accent}15` : 'none',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{acc.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: selectedRole === acc.id ? acc.accent : 'var(--color-ink)' }}>
                      {acc.icon} {acc.label} — {acc.name}
                    </span>
                  </div>
                  <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-charcoal)', letterSpacing: '0.5px' }}>
                    {acc.aadhaar}
                  </code>
                </div>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, border: selectedRole === acc.id ? `5px solid ${acc.accent}` : '2px solid var(--color-hairline)', background: 'var(--color-canvas)', transition: 'all 160ms ease' }} />
              </button>
            ))}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '8px',
            background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
            fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500, width: 'fit-content',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
            Demo environment — no real Aadhaar data used
          </div>
        </div>

        {/* ── Right: Auth card ── */}
        <div style={{
          background: 'var(--color-canvas)', borderRadius: '16px',
          border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-lg)', padding: '36px',
          minHeight: '480px', display: 'flex', flexDirection: 'column',
        }}>
          {/* Step: entry */}
          {step === 'entry' && (
            <>
              <div style={{ marginBottom: '28px' }}>
                {/* Aadhaar logo strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ padding: '6px 10px', borderRadius: '6px', background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🇮🇳</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: '#0369A1' }}>Aadhaar</span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>Verified Login</span>
                  </div>
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Enter your Aadhaar
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)' }}>
                  A 6-digit OTP will be sent to your registered mobile.
                </p>
              </div>

              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                {/* Aadhaar input */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>
                    Aadhaar Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🪪</span>
                    <input
                      id="aadhaar-input"
                      type="text"
                      inputMode="numeric"
                      value={aadhaarInput}
                      onChange={handleAadhaarChange}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      style={{
                        width: '100%', height: '48px', padding: '0 14px 0 42px',
                        borderRadius: '8px', border: aadhaarError ? '2px solid #EF4444' : '1px solid var(--color-hairline)',
                        background: 'var(--color-canvas)', fontFamily: 'monospace',
                        fontSize: '16px', color: 'var(--color-ink)', outline: 'none',
                        letterSpacing: '2px', transition: 'border 150ms',
                      }}
                      onFocus={e => { if (!aadhaarError) e.target.style.border = '2px solid var(--color-ink)' }}
                      onBlur={e => { if (!aadhaarError) e.target.style.border = '1px solid var(--color-hairline)' }}
                    />
                  </div>
                  {aadhaarError && (
                    <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{aadhaarError}</p>
                  )}
                  <p style={{ fontSize: '11px', color: 'var(--color-charcoal)', marginTop: '6px' }}>
                    Click a demo card on the left to auto-fill.
                  </p>
                </div>

                {/* Consent checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <input type="checkbox" id="consent" defaultChecked style={{ marginTop: '3px', accentColor: '#0F172A', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="consent" style={{ fontSize: '12px', color: 'var(--color-charcoal)', lineHeight: 1.5, cursor: 'pointer' }}>
                    I consent to sharing my Aadhaar details for identity verification as per UIDAI guidelines. <span style={{ color: 'var(--color-primary)' }}>Demo only — no real data used.</span>
                  </label>
                </div>

                <button
                  id="btn-send-otp"
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', height: '46px', borderRadius: '8px', border: 'none',
                    background: activeAccount?.accent ?? 'var(--color-ink)',
                    color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                    transition: 'all 180ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {loading ? (
                    <><Spinner /> Sending OTP…</>
                  ) : 'Send OTP'}
                </button>

                {/* Quick access */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-charcoal)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Quick demo access
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {DEMO_ACCOUNTS.map(acc => (
                      <button
                        key={acc.id}
                        id={`quick-${acc.id}`}
                        type="button"
                        onClick={() => handleQuickAccess(acc.id)}
                        disabled={loading}
                        style={{
                          flex: 1, padding: '8px 6px', borderRadius: '8px', border: '1px solid var(--color-hairline)',
                          background: 'var(--color-cloud)', fontFamily: 'var(--font-body)', fontSize: '12px',
                          fontWeight: 500, color: 'var(--color-charcoal)', cursor: 'pointer',
                          transition: 'all 150ms ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = acc.accent
                          e.currentTarget.style.color = acc.accent
                          e.currentTarget.style.background = acc.accentBg
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--color-hairline)'
                          e.currentTarget.style.color = 'var(--color-charcoal)'
                          e.currentTarget.style.background = 'var(--color-cloud)'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{acc.icon}</span>
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </>
          )}

          {/* Step: OTP */}
          {step === 'otp' && activeAccount && (
            <>
              <div style={{ marginBottom: '28px' }}>
                <button
                  onClick={() => { setStep('entry'); setOtp(''); setOtpError('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-charcoal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '0' }}
                >
                  ← Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: activeAccount.accentBg, border: `1px solid ${activeAccount.accentBorder}` }}>
                  <span style={{ fontSize: '20px' }}>{activeAccount.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: activeAccount.accent }}>{activeAccount.label} — {activeAccount.name}</div>
                    <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-charcoal)' }}>{maskAadhaar(activeAccount.aadhaar)}</code>
                  </div>
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Enter OTP
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal)' }}>
                  6-digit OTP sent to mobile linked with Aadhaar.{' '}
                  <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Demo OTP: 123456</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '13px', color: 'var(--color-ink)', marginBottom: '6px' }}>
                    One-Time Password
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError('') }}
                    placeholder="_ _ _ _ _ _"
                    maxLength={6}
                    autoFocus
                    style={{
                      width: '100%', height: '56px', borderRadius: '8px',
                      border: otpError ? '2px solid #EF4444' : '1px solid var(--color-hairline)',
                      background: 'var(--color-canvas)', fontFamily: 'monospace',
                      fontSize: '24px', color: 'var(--color-ink)', outline: 'none',
                      letterSpacing: '8px', textAlign: 'center', transition: 'border 150ms',
                    }}
                    onFocus={e => { if (!otpError) e.target.style.border = '2px solid var(--color-ink)' }}
                    onBlur={e => { if (!otpError) e.target.style.border = '1px solid var(--color-hairline)' }}
                  />
                  {otpError && <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{otpError}</p>}
                </div>

                <button
                  id="btn-verify-otp"
                  type="submit"
                  disabled={loading || otp.length < 6}
                  style={{
                    width: '100%', height: '46px', borderRadius: '8px', border: 'none',
                    background: activeAccount.accent, color: '#fff',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
                    cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                    opacity: (loading || otp.length < 6) ? 0.6 : 1,
                    transition: 'all 180ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {loading ? <><Spinner />Verifying…</> : `Enter ${activeAccount.label} Portal`}
                </button>

                <button type="button" onClick={() => { setOtp(''); setStep('entry') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-charcoal)', textDecoration: 'underline' }}>
                  Resend OTP / Change Aadhaar
                </button>
              </form>
            </>
          )}

          {/* Step: success */}
          {step === 'success' && activeAccount && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: activeAccount.accentBg, border: `2px solid ${activeAccount.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                ✓
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: activeAccount.accent }}>
                Verified!
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-charcoal)' }}>
                Redirecting to {activeAccount.label} portal…
              </p>
              <div style={{ width: '48px', height: '3px', borderRadius: '2px', background: 'var(--color-hairline)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: activeAccount.accent, animation: 'progress 1.2s ease forwards' }} />
              </div>
            </div>
          )}

          <p style={{ marginTop: '20px', fontSize: '11px', color: '#94A3B8', textAlign: 'center', lineHeight: 1.5 }}>
            Demo environment · Aadhaar numbers are fictitious<br />
            No real identity data is collected or stored.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0 } to { width: 100% } }
        @media (max-width: 768px) {
          main > div { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </main>
  )
}

function Spinner() {
  return (
    <span style={{
      width: '16px', height: '16px',
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff', borderRadius: '50%',
      display: 'inline-block', animation: 'spin 0.65s linear infinite',
    }} />
  )
}


