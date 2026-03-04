import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { id: 'citizen', emoji: '🧑‍💼', label: 'Citizen', hindi: 'नागरिक' },
  { id: 'officer', emoji: '👮', label: 'Officer', hindi: 'अधिकारी' },
  { id: 'leader', emoji: '🏛️', label: 'MLA / Leader', hindi: 'नेता' },
]

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
        userData = await register({ full_name: name, email, password, role })
      }
      const paths = { citizen: '/citizen', officer: '/officer', leader: '/leader' }
      navigate(paths[userData.role] || '/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* India tricolor header strip */}
      <div style={{ height: '6px', background: 'linear-gradient(to right, var(--saffron) 33.3%, white 33.3%, white 66.6%, var(--green) 66.6%)' }} />

      {/* Top bar */}
      <div style={{ background: 'var(--navy)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--saffron)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem' }}>P</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>PRAJA</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem', letterSpacing: '2px' }}>CITIZEN GRIEVANCE PLATFORM</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Welcome card */}
          <div style={{ background: 'var(--card)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ background: 'var(--saffron-light)', padding: '24px 28px 20px', borderBottom: '1px solid var(--saffron-mid)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--saffron-dark)' }}>
                {mode === 'login' ? '🙏 Welcome back' : '📋 Create account'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '4px', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                {mode === 'login' ? 'अपने खाते में लॉग इन करें' : 'नया खाता बनाएं'}
              </div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Role selector (register only) */}
              {mode === 'register' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>
                    I am a / मैं हूँ
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {ROLES.map(r => (
                      <button key={r.id} type="button" onClick={() => setRole(r.id)} style={{
                        padding: '12px 6px', borderRadius: '10px', border: `2px solid ${role === r.id ? 'var(--saffron)' : 'var(--border)'}`,
                        background: role === r.id ? 'var(--saffron-light)' : 'var(--bg)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
                      }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{r.emoji}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: role === r.id ? 'var(--saffron-dark)' : 'var(--text)' }}>{r.label}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{r.hindi}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {mode === 'register' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--light)', marginBottom: '6px' }}>Full Name / पूरा नाम</label>
                    <input
                      style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none', transition: 'border 0.15s' }}
                      value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar" required
                      onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--light)', marginBottom: '6px' }}>Email / ईमेल</label>
                  <input
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--light)', marginBottom: '6px' }}>Password / पासवर्ड</label>
                  <input
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    onFocus={e => e.target.style.borderColor = 'var(--saffron)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                {error && (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid #F5C6CB', borderRadius: '8px', padding: '10px 14px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', background: loading ? '#ccc' : 'var(--saffron)', border: 'none',
                  borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.3px', transition: 'background 0.15s'
                }}>
                  {loading ? 'Please wait...' : mode === 'login' ? '🔓 Sign In' : '✅ Create Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                {mode === 'login'
                  ? <>New to PRAJA? <span style={{ color: 'var(--navy)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setMode('register')}>Create account</span></>
                  : <>Already registered? <span style={{ color: 'var(--navy)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setMode('login')}>Sign in</span></>
                }
              </div>
            </div>
          </div>

          {/* Help text */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'var(--muted)' }}>
            🔒 Your data is secure &nbsp;|&nbsp; WhatsApp: +1 415 523 8886 (sandbox)
          </div>
        </div>
      </div>
    </div>
  )
}


const ROLES = [
  { id: 'citizen', label: 'Citizen',    desc: 'Submit and track complaints' },
  { id: 'officer', label: 'Officer',    desc: 'Manage and resolve tickets'  },
  { id: 'leader',  label: 'Leader (MLA)', desc: 'Constituency intelligence'  },
]

const S = {
  page:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', padding: '20px' },
  box:      { background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '18px', padding: '40px', width: '100%', maxWidth: '440px' },
  logo:     { fontSize: '1.6rem', fontWeight: 900, color: 'var(--saffron)', marginBottom: '4px' },
  sub:      { fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '30px', letterSpacing: '1px' },
  label:    { fontSize: '0.75rem', fontWeight: 700, color: 'var(--light)', marginBottom: '6px', display: 'block' },
  input:    { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontSize: '0.9rem', marginBottom: '16px', outline: 'none' },
  roleWrap: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  roleBtn:  (active) => ({ background: active ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(255,107,0,0.5)' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }),
  roleLabel:{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--white)', display: 'block', marginBottom: '2px' },
  roleDesc: { fontSize: '0.65rem', color: 'var(--muted)' },
  btn:      { width: '100%', background: 'linear-gradient(135deg, var(--saffron), var(--gold))', border: 'none', borderRadius: '10px', padding: '13px', color: '#000', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '0.5px' },
  error:    { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '0.82rem', marginBottom: '14px' },
  toggle:   { textAlign: 'center', marginTop: '18px', fontSize: '0.82rem', color: 'var(--muted)' },
  link:     { color: 'var(--saffron)', cursor: 'pointer', fontWeight: 700 },
}

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
      const paths = { citizen: '/citizen', officer: '/officer', leader: '/leader' }
      navigate(paths[userData.role] || '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>PRAJA</div>
        <div style={S.sub}>CITIZEN INTELLIGENCE PLATFORM</div>
        {mode === 'register' && (
          <>
            <label style={S.label}>I AM A</label>
            <div style={S.roleWrap}>
              {ROLES.map(r => (
                <div key={r.id} style={S.roleBtn(role === r.id)} onClick={() => setRole(r.id)}>
                  <span style={S.roleLabel}>{r.label}</span>
                  <span style={S.roleDesc}>{r.desc}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label style={S.label}>FULL NAME</label>
              <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Rajesh Kumar" required />
            </>
          )}
          <label style={S.label}>EMAIL</label>
          <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={S.label}>PASSWORD</label>
          <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div style={S.toggle}>
          {mode === 'login'
            ? <>New to PRAJA? <span style={S.link} onClick={() => setMode('register')}>Create account</span></>
            : <>Already registered? <span style={S.link} onClick={() => setMode('login')}>Sign in</span></>
          }
        </div>
      </div>
    </div>
  )
}
