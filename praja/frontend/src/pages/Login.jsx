import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
