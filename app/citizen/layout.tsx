'use client'

import { useEffect, useState } from 'react'
// Removed DB client

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('Citizen User')
  const [userRole, setUserRole] = useState('Resident')

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
