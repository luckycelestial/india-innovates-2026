import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)


export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('praja_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (aadhaar_number, _password) => {
    try {
      let role = 'citizen';
      let name = 'Demo User';
      let cleanAadhaar = aadhaar_number ? aadhaar_number.toString().replace(/\s/g, '').replace(/-/g, '') : '234567890123';
      
      if (cleanAadhaar === '111122223333') { role = 'sarpanch'; name = 'Lakshmi Devi'; }
      else if (cleanAadhaar === '789012345678') { role = 'district_collector'; name = 'Vikram Singh'; }
      else if (cleanAadhaar === '901234567890') { role = 'mla'; name = 'Arjun Mehta'; }
      else if (cleanAadhaar === '444455556666') { role = 'mp'; name = 'Rajendra Prasad'; }
      
      const mockUser = { id: 'mock-'+Date.now(), name: name, full_name: name, role: role, aadhaar_number: cleanAadhaar };
      const token = 'mock-token-' + Date.now();
      
      setUser(mockUser)
      localStorage.setItem('praja_token', token)
      localStorage.setItem('praja_user', JSON.stringify(mockUser))
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
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
