'use client'

import { Search, UserPlus } from 'lucide-react'

type UserManagementHeaderProps = {
  search: string
  setSearch: (val: string) => void
  roleFilter: string
  setRoleFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  onAddUserClick: () => void
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function UserManagementHeader({
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onAddUserClick
}: UserManagementHeaderProps) {
  return (
    <div style={{
      marginBottom: '28px',
      fontFamily: FONT_SANS
    }}>
      {/* Title block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '38px', color: '#0f172a', lineHeight: 1.2 }}>
            User & Role Management
          </h1>
          <p style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#475569', marginTop: '8px', lineHeight: 1.6, fontWeight: 400 }}>
            Manage platform authentication levels, departments, and operations personnel access.
          </p>
        </div>

        <button
          onClick={onAddUserClick}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
            transition: 'all 150ms'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
          onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#64748b' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone or ID..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 12px 0 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '14px',
                color: '#1e293b',
                outline: 'none',
                transition: 'all 150ms'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              background: '#ffffff',
              minWidth: '130px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Roles</option>
            <option value="citizen">Citizen</option>
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e293b',
              background: '#ffffff',
              minWidth: '130px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('')
              setRoleFilter('all')
              setStatusFilter('all')
            }}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px dashed #ef4444',
              color: '#ef4444',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}
