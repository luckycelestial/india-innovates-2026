'use client'

import { Shield, Users, ShieldAlert, Edit2 } from 'lucide-react'

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

type UserTableProps = {
  users: User[]
  onSelectUser: (user: User) => void
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function UserTable({ users, onSelectUser }: UserTableProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      fontFamily: FONT_SANS
    }}>
      {users.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '4px' }}>
            No users found
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '16px 20px' }}>Name</th>
                <th style={{ padding: '16px 20px' }}>Role</th>
                <th style={{ padding: '16px 20px' }}>Allocation (Dept/Ward)</th>
                <th style={{ padding: '16px 20px' }}>Contact</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px' }}>Last Active</th>
                <th style={{ padding: '16px 20px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                // Role Badge config
                let roleColor = '#475569'
                let roleBg = '#f1f5f9'
                let RoleIcon = Users
                if (user.role === 'admin') {
                  roleColor = '#0f172a'
                  roleBg = '#e2e8f0'
                  RoleIcon = ShieldAlert
                } else if (user.role === 'officer') {
                  roleColor = '#024ad8'
                  roleBg = '#e8f0fe'
                  RoleIcon = Shield
                }

                // Status chip config
                const isActive = user.status === 'active'
                const statusColor = isActive ? '#166534' : '#b3262b'
                const statusBg = isActive ? '#dcfce7' : '#fee2e2'

                return (
                  <tr
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'background-color 100ms'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {/* Name */}
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a' }}>{user.name}</td>
                    
                    {/* Role */}
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        color: roleColor,
                        background: roleBg,
                        textTransform: 'uppercase'
                      }}>
                        <RoleIcon size={12} />
                        {user.role}
                      </span>
                    </td>
                    
                    {/* Allocation */}
                    <td style={{ padding: '16px 20px', color: '#475569' }}>
                      {user.role === 'admin' && 'System Admin'}
                      {user.role === 'citizen' && (user.ward ? `Ward: ${user.ward}` : 'No Ward Mapped')}
                      {user.role === 'officer' && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                            {user.department || 'Unassigned Dept'}
                          </div>
                          {user.ward && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Ward: {user.ward}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    {/* Contact */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{user.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{user.phone}</div>
                    </td>
                    
                    {/* Status */}
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        color: statusColor,
                        background: statusBg,
                        textTransform: 'uppercase'
                      }}>
                        {user.status}
                      </span>
                    </td>
                    
                    {/* Last Active */}
                    <td style={{ padding: '16px 20px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {user.last_login}
                    </td>
                    
                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectUser(user)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 120ms'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#024ad8'
                          e.currentTarget.style.color = '#024ad8'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1'
                          e.currentTarget.style.color = '#475569'
                        }}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
