'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userName, setUserName] = useState('Ramesh Babu')
  const [userRole, setUserRole] = useState('System Admin')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name)
      }
      if (user?.user_metadata?.role) {
        setUserRole(user.user_metadata.role === 'admin' ? 'System Admin' : user.user_metadata.role)
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Expanding Left Sidebar overlay */}
      <Sidebar role="admin" userName={userName} userSub={userRole} />
      
      {/* Content wrapper with fixed padding offset for collapsed sidebar */}
      <div style={{ flex: 1, paddingLeft: '64px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
