import React, { createContext, useContext, useState, useEffect } from 'react'

const RoleContext = createContext(null)

// Demo users mapping to provide semi-realistic IDs for requests
const DEMO_USERS = {
  'citizen':  { id: '8fc290a5-bfa3-4348-b674-40ab2425c492', role: 'citizen', name: 'Ramesh Kumar' },
  'sarpanch': { id: '00000000-0000-0000-0000-000000000001', role: 'sarpanch', name: 'Sarpanch Sahab' },
  'collector': { id: '00000000-0000-0000-0000-000000000002', role: 'district_collector', name: 'District Collector' },
  'mla':       { id: '00000000-0000-0000-0000-000000000003', role: 'mla', name: 'Constituency MLA' },
  'mp':        { id: '00000000-0000-0000-0000-000000000004', role: 'mp', name: 'Parliament MP' }
}

export function RoleProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('praja_demo_user')
    return saved ? JSON.parse(saved) : null
  })

  const selectRole = (id) => {
    const userData = DEMO_USERS[id]
    if (userData) {
      setUser(userData)
      localStorage.setItem('praja_demo_user', JSON.stringify(userData))
      localStorage.setItem('praja_demo_role', userData.role)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('praja_demo_user')
    localStorage.removeItem('praja_demo_role')
  }

  return (
    <RoleContext.Provider value={{ user, selectRole, logout }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
