import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (aadhaar_number, password) => {
    const { data } = await api.post('/auth/login', { aadhaar_number, password })
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
