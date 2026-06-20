'use client'

import { useState, useEffect } from 'react'
import { X, ShieldAlert, Shield, Users, Save } from 'lucide-react'

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

type UserDetailDrawerProps = {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSave: (updatedUser: User) => void
  isNewUser?: boolean
}

const DEPARTMENTS = [
  'General Administration',
  'Water Supply Board',
  'Sanitation Department',
  'Electricity Department',
  'Roads & Pavement',
  'Solid Waste Management',
  'Parks & Public Spaces'
]

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const FONT_DISPLAY = "var(--font-display)"

export default function UserDetailDrawer({
  isOpen,
  onClose,
  user,
  onSave,
  isNewUser = false
}: UserDetailDrawerProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'citizen' | 'officer' | 'admin'>('citizen')
  const [status, setStatus] = useState<'active' | 'suspended'>('active')
  const [department, setDepartment] = useState('')
  const [ward, setWard] = useState('')

  // Sync state with selected user
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPhone(user.phone)
      setRole(user.role)
      setStatus(user.status)
      setDepartment(user.department || '')
      setWard(user.ward || '')
    } else if (isNewUser) {
      setName('')
      setEmail('')
      setPhone('')
      setRole('citizen')
      setStatus('active')
      setDepartment('')
      setWard('')
    }
  }, [user, isOpen, isNewUser])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return

    const updatedUser: User = {
      id: user?.id || `user-${Math.random().toString(36).substring(2, 9)}`,
      name,
      email,
      phone,
      role,
      status,
      department: role === 'officer' ? department || DEPARTMENTS[0] : null,
      ward: role !== 'admin' ? ward || null : null,
      last_login: user?.last_login || 'Never',
      created_at: user?.created_at || new Date().toISOString().split('T')[0]
    }

    onSave(updatedUser)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 200,
      display: 'flex',
      justifyContent: 'flex-end',
      fontFamily: FONT_SANS
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 150ms'
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        animation: 'slideIn 200ms ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '18px', color: '#0f172a', margin: 0 }}>
              {isNewUser ? 'Create New User' : 'Edit User Profile'}
            </h3>
            {!isNewUser && user && (
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                User ID: {user.id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '14px', color: '#1e293b', outline: 'none'
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '14px', color: '#1e293b', outline: 'none'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '14px', color: '#1e293b', outline: 'none'
                }}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Access Role</label>
              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                {(['citizen', 'officer', 'admin'] as const).map(r => {
                  const isActive = role === r
                  let IconComp = Users
                  if (r === 'officer') IconComp = Shield
                  if (r === 'admin') IconComp = ShieldAlert

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px',
                        border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#0f172a' : '#64748b',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 150ms'
                      }}
                    >
                      <IconComp size={14} />
                      <span style={{ textTransform: 'capitalize' }}>{r}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Account Status</label>
              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                {(['active', 'suspended'] as const).map(s => {
                  const isActive = status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '6px',
                        border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        background: isActive ? (s === 'active' ? '#dcfce7' : '#fee2e2') : 'transparent',
                        color: isActive ? (s === 'active' ? '#166534' : '#b3262b') : '#64748b',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 150ms',
                        textTransform: 'capitalize'
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Role Conditional Fields */}
            {role === 'officer' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>Assigned Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '14px', color: '#1e293b', background: '#ffffff', outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {role !== 'admin' && (
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                  {role === 'officer' ? 'Assigned Ward / Area' : 'Ward / Residential Area'}
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={e => setWard(e.target.value)}
                  placeholder="e.g. Ward 42, Kinnathukadavu"
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '14px', color: '#1e293b', outline: 'none'
                  }}
                />
              </div>
            )}

          </div>

          {/* Footer Action Buttons */}
          <div style={{
            marginTop: '32px',
            display: 'flex',
            gap: '12px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1',
                background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '14px',
                cursor: 'pointer', transition: 'all 120ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1, height: '42px', borderRadius: '8px', border: 'none',
                background: '#0f172a', color: '#ffffff', fontWeight: 600, fontSize: '14px',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)', transition: 'all 150ms'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
            >
              <Save size={16} />
              Save changes
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
