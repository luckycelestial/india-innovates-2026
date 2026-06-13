'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/sidebar'

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userName, setUserName] = useState('Priya Nair')
  const [userRole, setUserRole] = useState('Ward Officer')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name)
      }
      if (user?.user_metadata?.role) {
        setUserRole(user.user_metadata.role === 'officer' ? 'Ward Officer' : user.user_metadata.role)
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Expanding Left Sidebar overlay */}
      <Sidebar role="officer" userName={userName} userSub={userRole} />
      
      {/* Content wrapper with fixed padding offset for collapsed sidebar */}
      <div style={{ flex: 1, paddingLeft: '64px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
