'use client'

import { useEffect, useState } from 'react'
// Removed DB client

export default function OfficialDashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('Admin User')
  const [userRole, setUserRole] = useState('Super Admin')

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
