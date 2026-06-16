'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/sidebar'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userName, setUserName] = useState('Citizen User')
  const [userRole, setUserRole] = useState('Resident')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.name) {
          setUserName(user.user_metadata.name)
        }
      } catch (err) {
        console.log('Skipping Supabase user fetch in demo mode')
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Collapsible Left Sidebar for Citizen */}
      <Sidebar role="citizen" userName={userName} userSub={userRole} />
      
      {/* Content Area */}
      <div style={{ flex: 1, paddingLeft: '64px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
