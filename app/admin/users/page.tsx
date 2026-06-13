'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserManagementHeader from '@/components/admin/user-management-header'
import UserSummaryCards from '@/components/admin/user-summary-cards'
import UserTable from '@/components/admin/user-table'
import UserDetailDrawer from '@/components/admin/user-detail-drawer'

type User = {
  id: string
  name: string
  email: string
  phone: string
  role: 'citizen' | 'officer' | 'admin'
  ward: string | null
  department: string | null
  status: 'active' | 'suspended'
  last_login: string
  created_at: string
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function UserRoleManagementPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)

  useEffect(() => {
    let active = true
    let channel: any = null

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (active && !error && data) {
        setUsers(data)
      }
    }

    const load = async () => {
      await fetchUsers()
      if (active) setLoading(false)

      const channelName = `admin_users_changes_${Math.random().toString(36).substring(2, 9)}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            fetchUsers()
          }
        )
        .subscribe()
    }

    load()

    return () => {
      active = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // Save changes handler
  const handleSaveUser = async (updatedUser: User) => {
    if (isAddingNew) {
      // Exclude created_at from insert, let DB use default now()
      const { id, created_at, ...insertData } = updatedUser
      const { error } = await supabase
        .from('profiles')
        .insert([insertData])

      if (error) {
        alert('Failed to create user: ' + error.message)
        return
      }
    } else {
      const { created_at, ...updateData } = updatedUser
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', updatedUser.id)

      if (error) {
        alert('Failed to update user: ' + error.message)
        return
      }
    }

    setIsDrawerOpen(false)
    setSelectedUser(null)
    setIsAddingNew(false)
  }

  // Close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedUser(null)
    setIsAddingNew(false)
  }

  // KPI calculations
  const citizensCount = users.filter(u => u.role === 'citizen').length
  const officersCount = users.filter(u => u.role === 'officer').length
  const adminsCount = users.filter(u => u.role === 'admin').length
  const suspendedCount = users.filter(u => u.status === 'suspended').length
  const unassignedOfficersCount = users.filter(u => u.role === 'officer' && (!u.ward || u.ward.toLowerCase() === 'unassigned')).length

  // Filter lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          (u.phone && u.phone.includes(search)) ||
                          u.id.toLowerCase().includes(search.toLowerCase())

    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ height: '40px', width: '250px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '24px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: '90px', background: '#e2e8f0', borderRadius: '8px' }}></div>
            ))}
          </div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '12px' }}></div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 24px', fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Management Header */}
        <UserManagementHeader
          search={search}
          setSearch={setSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddUserClick={() => {
            setIsAddingNew(true)
            setSelectedUser(null)
            setIsDrawerOpen(true)
          }}
        />

        {/* Operational Counters */}
        <UserSummaryCards
          citizensCount={citizensCount}
          officersCount={officersCount}
          adminsCount={adminsCount}
          suspendedCount={suspendedCount}
          unassignedOfficersCount={unassignedOfficersCount}
        />

        {/* Main User Grid Table */}
        <UserTable
          users={filteredUsers}
          onSelectUser={(u) => {
            setSelectedUser(u)
            setIsAddingNew(false)
            setIsDrawerOpen(true)
          }}
        />

        {/* Slide-out details drawer */}
        <UserDetailDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          user={selectedUser}
          onSave={handleSaveUser}
          isNewUser={isAddingNew}
        />

      </div>
    </main>
  )
}
