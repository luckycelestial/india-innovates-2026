import { createContext, useContext, useState, useCallback } from 'react'

const SUPABASE_URL = 'https://bbakxtofuxkxzfbexlll.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYWt4dG9mdXhreHpmYmV4bGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDk5ODgsImV4cCI6MjA4ODEyNTk4OH0.mIo2NFZxTm_tvXVTH2o0ErNvwXBfaXBkA12N0KIDyAY'

const AuthContext = createContext(null)

/**
 * Look up a user directly from Supabase by Aadhaar number.
 * No backend required — prototype login, no password check.
 */
async function fetchUserByAadhaar(aadhaar) {
  const url = `${SUPABASE_URL}/rest/v1/users?aadhaar_number=eq.${aadhaar}&select=*&limit=1`
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) throw new Error('Database lookup failed')
  const rows = await res.json()
  return rows?.[0] || null
}

/**
 * Get a backend JWT token using the Supabase user.
 * Falls back to a mock token if backend is unreachable.
 */
async function getToken(aadhaarNumber) {
  // Try the real backend first
  try {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://prajavox-backend.vercel.app'
    if (backendUrl) {
      const resp = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar_number: aadhaarNumber, password: 'Demo' }),
        signal: AbortSignal.timeout(5000),
      })
      if (resp.ok) {
        const data = await resp.json()
        return data.access_token
      }
    }
  } catch {
    // Backend unreachable — use Supabase anon key as session token for prototype
  }
  // Prototype fallback: encode user info in a simple base64 token
  return `proto_${btoa(aadhaarNumber + ':' + Date.now())}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (aadhaar_number, _password) => {
    // Strip spaces/dashes from Aadhaar input
    const aadhaar = aadhaar_number.replace(/\s|-/g, '')
    if (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) {
      throw new Error('Aadhaar number must be exactly 12 digits')
    }

    // Fetch user record directly from Supabase — no backend, no password check
    const row = await fetchUserByAadhaar(aadhaar)
    if (!row) {
      throw new Error('Aadhaar not registered in PRAJA. Please check the number.')
    }

    const token = await getToken(aadhaar)

    const userData = {
      id:           row.id,
      name:         row.full_name || row.name,
      role:         row.role,
      constituency: row.constituency,
      token,
    }

    localStorage.setItem('praja_user', JSON.stringify(userData))
    localStorage.setItem('praja_token', token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('praja_user')
    localStorage.removeItem('praja_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
