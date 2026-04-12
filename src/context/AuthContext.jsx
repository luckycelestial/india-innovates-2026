import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

const DEMO_USERS = {
  '234567890123': { id: 'demo-citizen',    name: 'Ramesh Kumar',    role: 'citizen' },
  '111122223333': { id: 'demo-sarpanch',   name: 'Lakshmi Devi',    role: 'sarpanch' },
  '789012345678': { id: 'demo-collector',  name: 'Vikram Singh',    role: 'district_collector' },
  '901234567890': { id: 'demo-mla',        name: 'Arjun Mehta',     role: 'mla' },
  '444455556666': { id: 'demo-mp',         name: 'Rajendra Prasad', role: 'mp' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (aadhaar_number, password) => {
    const cleanAadhaar = aadhaar_number
      ? aadhaar_number.toString().replace(/\s/g, '').replace(/-/g, '')
      : ''

    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      throw new Error('Aadhaar number must be exactly 12 digits')
    }

    try {
      const resp = await api.post('/auth/login', {
        aadhaar_number: cleanAadhaar,
        password: password || 'Demo',
      })
      const { user: backendUser } = resp.data
      backendUser.full_name = backendUser.full_name || backendUser.name
      setUser(backendUser)
      localStorage.setItem('praja_user', JSON.stringify(backendUser))
      return true
    } catch (backendErr) {
      console.warn('Backend login failed, falling back to demo mode:', backendErr.message)
    }

    const demoUser = DEMO_USERS[cleanAadhaar]
    if (demoUser) {
      const mockUser = { ...demoUser, full_name: demoUser.name, aadhaar_number: cleanAadhaar }
      setUser(mockUser)
      localStorage.setItem('praja_user', JSON.stringify(mockUser))
      return true
    }

    const fallbackUser = { id: 'demo-' + Date.now(), name: 'Demo User', full_name: 'Demo User', role: 'citizen', aadhaar_number: cleanAadhaar }
    setUser(fallbackUser)
    localStorage.setItem('praja_user', JSON.stringify(fallbackUser))
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('praja_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
