'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/sidebar'

export default function OfficialDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userName, setUserName] = useState('Admin')
  const [userRole, setUserRole] = useState('Super Admin')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.name) {
          setUserName(user.user_metadata.name)
        }
        if (user?.user_metadata?.role) {
          setUserRole(user.user_metadata.role === 'admin' ? 'Super Admin' : user.user_metadata.role)
        }
      } catch (err) {
        console.log('Skipping Supabase user fetch in demo mode')
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Collapsible Left Sidebar */}
      <Sidebar role="admin" userName={userName} userSub={userRole} />
      
      {/* Content Area */}
      <div style={{ flex: 1, paddingLeft: '64px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
