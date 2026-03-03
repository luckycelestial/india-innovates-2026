import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const userData = {
      id:    data.user.id,
      name:  data.user.full_name,
      role:  data.user.role,
      token: data.access_token,
    }
    localStorage.setItem('praja_user', JSON.stringify(userData))
    localStorage.setItem('praja_token', data.access_token)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', {
      full_name: payload.name,
      email:     payload.email,
      password:  payload.password,
      role:      payload.role || 'citizen',
    })
    const userData = {
      id:    data.user.id,
      name:  data.user.full_name,
      role:  data.user.role,
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
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
