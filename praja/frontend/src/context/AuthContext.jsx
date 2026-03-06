import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const SUPABASE_URL = 'https://bbakxtofuxkxzfbexlll.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYWt4dG9mdXhreHpmYmV4bGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDk5ODgsImV4cCI6MjA4ODEyNTk4OH0.mIo2NFZxTm_tvXVTH2o0ErNvwXBfaXBkA12N0KIDyAY'

const AuthContext = createContext(null)

// Look up a user's email by aadhaar number (used as fallback for older backend)
async function getEmailByAadhaar(aadhaar) {
  const url = `${SUPABASE_URL}/rest/v1/users?aadhaar_number=eq.${aadhaar}&select=email`
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0]?.email || null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (aadhaar_number, password) => {
    let data
    try {
      // Try the current backend (aadhaar_number + password)
      const resp = await api.post('/auth/login', { aadhaar_number, password })
      data = resp.data
    } catch (err) {
      // If the backend requires 'email' (older deployment), fall back
      const detail = err.response?.data?.detail
      const needsEmail = Array.isArray(detail) && detail.some(d => d.loc?.includes('email'))
      if (!needsEmail) throw err

      const email = await getEmailByAadhaar(aadhaar_number)
      if (!email) throw new Error('User not found. Please check your Aadhaar number.')
      const resp = await api.post('/auth/login', { email, password })
      data = resp.data
    }

    const userData = {
      id: data.user?.id,
      name: data.user?.full_name || data.user?.name,
      role: data.user?.role,
      constituency: data.user?.constituency,
      token: data.access_token,
    }
    localStorage.setItem('praja_user', JSON.stringify(userData))
    localStorage.setItem('praja_token', data.access_token)
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
