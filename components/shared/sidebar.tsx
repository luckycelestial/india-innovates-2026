'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Home, ClipboardList, FilePlus, Search, Scale, Kanban, Lock, LogOut, Users, GitFork, AlertTriangle, BarChart2, Compass, ShieldAlert, Brain } from 'lucide-react'

type SidebarProps = {
  role: 'citizen' | 'admin'
  userName: string
  userSub?: string
}

type MenuItem = {
  label: string
  href: string
  icon: React.ComponentType<any>
}

const MENU_ITEMS: Record<'citizen' | 'admin', MenuItem[]> = {
  citizen: [
    { label: 'Citizen Portal', href: '/citizen/home', icon: Home },
    { label: 'Heatmaps', href: '/admin/crime-intelligence', icon: Compass },
    { label: 'OpenCity Civic Data', href: '/admin/civic-data', icon: ClipboardList },
  ],
  admin: [
    { label: 'City Overview', href: '/official/dashboard', icon: Home },
    { label: 'ML Predictor', href: '/admin/ml-predictor', icon: Brain },
    { label: 'Grievance Registry', href: '/admin/analytics', icon: BarChart2 },
    { label: 'Grievance Board', href: '/officer/dashboard', icon: Kanban },
    { label: 'Crime Analysis', href: '/admin/crime-analysis', icon: GitFork },
    { label: 'Heatmaps', href: '/admin/crime-intelligence', icon: Compass },
    { label: 'OpenCity Civic Data', href: '/admin/civic-data', icon: ClipboardList },
  ]
}

export default function Sidebar({ role, userName, userSub }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)

  const items = MENU_ITEMS[role] || []

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    router.push('/login')
  }

  // Initials
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: isHovered ? '240px' : '64px',
        backgroundColor: '#000000', // Sleek dark slate
        color: '#F8FAFC',
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        fontFamily: 'var(--font-display)'
      }}
    >
      {/* Top Section: Branding */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: isHovered ? '16px 12px' : '16px 0' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: isHovered ? 'flex-start' : 'center', padding: isHovered ? '0' : '0 12px' }}>
          <div style={{ width: '40px', height: '40px', position: 'relative', flexShrink: 0 }}>
            <Image
              src="/logo-square.jpg"
              alt="KSP CIAP"
              width={40}
              height={40}
              style={{ borderRadius: '16px', objectFit: 'cover' }}
            />
          </div>
          {isHovered && (
            <span style={{ 
              fontWeight: 800, 
              fontSize: '18px', 
              letterSpacing: '1px', 
              color: '#ffffff',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              KSP CIAP
            </span>
          )}
        </Link>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: isHovered ? 'stretch' : 'center', padding: isHovered ? '0' : '0 8px' }}>
          {items.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 12px',
                  justifyContent: isHovered ? 'flex-start' : 'center',
                  width: isHovered ? '100%' : '44px',
                  height: '44px',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : '#94A3B8',
                  background: isActive ? '#1E293B' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '14px',
                  transition: 'all 150ms ease-in-out'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = '#ffffff'
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = '#94A3B8'
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={20} />
                </span>
                {isHovered && (
                  <span style={{ 
                    whiteSpace: 'nowrap',
                    animation: 'fadeIn 0.15s ease-out'
                  }}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Profile & Logout */}
      <div style={{
        padding: isHovered ? '16px 12px' : '16px 8px',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        alignItems: isHovered ? 'stretch' : 'center'
      }}>
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: isHovered ? 'flex-start' : 'center', width: '100%' }}>
          {/* Avatar circle */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#0EA5E9',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '14px',
            flexShrink: 0
          }}>
            {initials}
          </div>
          {isHovered && (
            <div style={{ 
              minWidth: 0, 
              flex: 1,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userName}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: '#64748B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userSub || role}
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '10px 12px',
            justifyContent: isHovered ? 'flex-start' : 'center',
            width: isHovered ? '100%' : '44px',
            height: '44px',
            borderRadius: '16px',
            border: 'none',
            background: 'transparent',
            color: '#EF4444',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={20} />
          </span>
          {isHovered && (
            <span style={{ 
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              Sign Out
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </aside>
  )
}
