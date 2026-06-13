'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/shared/sidebar'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userName, setUserName] = useState('Citizen')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name)
      } else if (user?.email) {
        setUserName(user.email.split('@')[0])
      }
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Expanding Left Sidebar overlay */}
      <Sidebar role="citizen" userName={userName} userSub="Citizen Portal" />
      
      {/* Content wrapper with fixed padding offset for collapsed sidebar */}
      <div style={{ flex: 1, paddingLeft: '64px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
