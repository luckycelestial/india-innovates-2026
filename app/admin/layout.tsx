'use client'

import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('Ramesh Babu')
  const [userRole, setUserRole] = useState('System Admin')

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
