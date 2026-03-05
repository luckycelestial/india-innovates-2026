import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('citizen')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let userData
      if (mode === 'login') {
        userData = await login(email, password)
      } else {
        userData = await register({ name, email, password, role })
      }
      const r = userData?.role || role
      if (r === 'officer') navigate('/officer')
      else if (r === 'leader') navigate('/leader')
      else navigate('/citizen')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    border: '1.5px solid var(--border)', borderRadius: '8px',
    fontSize: '0.92rem', background: '#FAFBFF', color: 'var(--text)', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Tricolor strip */}
      <div style={{ height: '4px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />

      {/* Top nav bar */}
      <div style={{ background: 'var(--navy)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--saffron)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>P</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '1px' }}>PRAJA</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Citizen Grievance Platform</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '0', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,53,128,0.10)', overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{ background: 'var(--saffron-light)', borderBottom: '1px solid var(--saffron-mid)', padding: '22px 28px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--saffron-dark)' }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '3px' }}>
              {mode === 'login' ? 'Sign in to your PRAJA account' : 'Join PRAJA — your voice, your city'}
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '8px', padding: '3px', marginBottom: '20px' }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                  background: mode === m ? 'var(--card)' : 'transparent',
                  fontWeight: mode === m ? 700 : 400,
                  color: mode === m ? 'var(--navy)' : 'var(--muted)',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  fontSize: '0.88rem',
                }}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Full Name</label>
                  <input style={inp} placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required
                    onFocus={e => e.target.style.borderColor = 'var(--navy)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
              )}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Email</label>
                <input style={inp} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={e => e.target.style.borderColor = 'var(--navy)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Password</label>
                <input style={inp} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  onFocus={e => e.target.style.borderColor = 'var(--navy)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              {error && <div style={{ background: '#FDF3F3', border: '1px solid #F5C6CB', borderRadius: '7px', padding: '10px 13px', color: 'var(--danger)', fontSize: '0.83rem', marginBottom: '14px' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px', background: loading ? '#ccc' : 'var(--saffron)',
                border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              {mode === 'login' ? "New to PRAJA? " : "Already have an account? "}
              <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                style={{ color: 'var(--saffron)', cursor: 'pointer', fontWeight: 700 }}>
                {mode === 'login' ? 'Create account' : 'Sign in'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '12px', color: 'var(--muted)', fontSize: '0.75rem' }}>
        Your data is secure &nbsp;|&nbsp; WhatsApp: +1 415 523 8886 (sandbox)
      </div>
    </div>
  )
}