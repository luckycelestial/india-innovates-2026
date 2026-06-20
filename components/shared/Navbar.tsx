'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Bell, Search, Home, Compass, GitFork, ShieldAlert, 
  BarChart2, LogOut, ChevronDown, ChevronUp, ClipboardList,
  FilePlus, Scale, Kanban, Lock, AlertTriangle, Users
} from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [isHovered, setIsHovered] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userName, setUserName] = useState('User')
  const [userRole, setUserRole] = useState('Member')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        if (user.user_metadata?.name) {
          setUserName(user.user_metadata.name)
        } else if (user.email) {
          setUserName(user.email.split('@')[0])
        }
        if (user.user_metadata?.role) {
          const r = user.user_metadata.role
          setUserRole(r === 'admin' ? 'Super Admin' : r === 'officer' ? 'Ward Officer' : r)
        }
      }
    }
    load()
  }, [])

  // Determine user mode based on route path
  const isOfficial = pathname?.startsWith('/official') || pathname?.startsWith('/admin') || pathname?.startsWith('/officer')
  const isCitizen = pathname?.startsWith('/citizen')
  const isPortal = isOfficial || isCitizen

  // Automatic clean up of hover dropdown when sidebar is unhovered
  const handleMouseLeave = () => {
    setIsHovered(false)
    setDropdownOpen(false)
  }

  const handleLogout = () => {
    router.push('/login')
  }

  // Common styles
  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: isHovered ? '240px' : '64px',
    backgroundColor: '#ffffff', // Clean white theme
    color: '#262622',
    borderRight: '1px solid #dadad3',
    zIndex: 5000,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  // Horizontal Header Style (Public Landing / Login)
  const headerStyle: React.CSSProperties = {
    background: '#36375D', 
    color: '#ffffff',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    borderBottom: '1px solid #dadad3',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  // 1. Official/Admin Vertical Sidebar View
  if (isOfficial) {
    const activeType = searchParams ? searchParams.get('type') : null

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            padding-left: 64px !important;
            transition: padding-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            color: #64748b !important;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            background: transparent !important;
            border-left: 4px solid transparent;
            transition: all 150ms ease-in-out;
            white-space: nowrap;
            width: 100%;
            cursor: pointer;
            box-sizing: border-box;
          }
          .sidebar-link:hover {
            color: #262622 !important;
            background: #f6f6f3 !important;
          }
          .sidebar-link.active {
            color: #e60023 !important;
            background: #f6f6f3 !important;
            border-left: 4px solid #e60023 !important;
            font-weight: 700;
          }
          .sidebar-logout {
            color: #ef4444 !important;
          }
          .sidebar-logout:hover {
            background: rgba(239, 68, 68, 0.08) !important;
            color: #ef4444 !important;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-6px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}} />

        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={sidebarStyle}
        >
          {/* Top Section: Branding & Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
            {/* Branding with Logos */}
            <Link 
              href="/official/dashboard" 
              style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '0 8px',
                height: '56px',
                overflow: 'hidden'
              }}
            >
              {isHovered ? (
                <img 
                  src="/Logos/RL_Transparent.png" 
                  alt="KSP CIAP" 
                  style={{ height: '48px', objectFit: 'contain', animation: 'fadeIn 0.15s ease-out' }} 
                />
              ) : (
                <img 
                  src="/Logos/SL_Transparent.png" 
                  alt="KSP" 
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }} 
                />
              )}
            </Link>

            {/* Navigation links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
              {pathname?.startsWith('/officer') ? (
                <>
                  <Link 
                    href="/officer/dashboard" 
                    className={`sidebar-link ${pathname === '/officer/dashboard' ? 'active' : ''}`}
                  >
                    <Scale size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Grievance Queue</span>}
                  </Link>

                  <Link 
                    href="/officer/pipeline" 
                    className={`sidebar-link ${pathname === '/officer/pipeline' ? 'active' : ''}`}
                  >
                    <Kanban size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Pipeline Board</span>}
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/official/dashboard" 
                    className={`sidebar-link ${pathname === '/official/dashboard' ? 'active' : ''}`}
                  >
                    <Home size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>City Overview</span>}
                  </Link>

                  {/* Heatmaps Dropdown Accordion */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDropdownOpen(!dropdownOpen)
                      }}
                      className={`sidebar-link ${pathname?.startsWith('/admin/crime-intelligence') ? 'active' : ''}`}
                    >
                      <Compass size={20} style={{ flexShrink: 0 }} />
                      {isHovered && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', animation: 'fadeIn 0.15s ease-out' }}>
                          <span style={{ flex: 1 }}>Heatmaps</span>
                          {dropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      )}
                    </button>

                    {/* Dropdown Items */}
                    {isHovered && dropdownOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', background: '#f6f6f3', padding: '4px 0' }}>
                        <Link
                          href="/admin/crime-intelligence?type=aqi"
                          onClick={() => setDropdownOpen(false)}
                          className={`sidebar-link ${(pathname?.startsWith('/admin/crime-intelligence') && activeType === 'aqi') ? 'active' : ''}`}
                          style={{ paddingLeft: '44px', fontSize: '12px' }}
                        >
                          <BarChart2 size={16} />
                          <span>🌬️ AQI Heatmap</span>
                        </Link>
                        <Link
                          href="/admin/crime-intelligence?type=weather"
                          onClick={() => setDropdownOpen(false)}
                          className={`sidebar-link ${(pathname?.startsWith('/admin/crime-intelligence') && activeType === 'weather') ? 'active' : ''}`}
                          style={{ paddingLeft: '44px', fontSize: '12px' }}
                        >
                          <BarChart2 size={16} />
                          <span>🌦️ Weather &amp; Temp</span>
                        </Link>
                        <Link
                          href="/admin/crime-intelligence?type=incidents"
                          onClick={() => setDropdownOpen(false)}
                          className={`sidebar-link ${(pathname?.startsWith('/admin/crime-intelligence') && activeType === 'incidents') ? 'active' : ''}`}
                          style={{ paddingLeft: '44px', fontSize: '12px' }}
                        >
                          <BarChart2 size={16} />
                          <span>🚨 Incident Counts</span>
                        </Link>
                        <Link
                          href="/admin/crime-intelligence?type=crime"
                          onClick={() => setDropdownOpen(false)}
                          className={`sidebar-link ${(pathname?.startsWith('/admin/crime-intelligence') && activeType === 'crime') ? 'active' : ''}`}
                          style={{ paddingLeft: '44px', fontSize: '12px' }}
                        >
                          <BarChart2 size={16} />
                          <span>🛡️ Crime Density</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link 
                    href="/admin/link-analysis" 
                    className={`sidebar-link ${pathname === '/admin/link-analysis' ? 'active' : ''}`}
                  >
                    <GitFork size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>KSP Link Analysis</span>}
                  </Link>

                  <Link 
                    href="/admin/predictive-insights" 
                    className={`sidebar-link ${pathname === '/admin/predictive-insights' ? 'active' : ''}`}
                  >
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>KSP Predictive Risk</span>}
                  </Link>

                  {/* Admin Console & Tools from main branch */}
                  <div style={{ margin: '8px 16px 4px', borderTop: '1px solid #dadad3', paddingTop: '8px' }}>
                    {isHovered && <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>SYSTEM CONTROL</span>}
                  </div>

                  <Link 
                    href="/admin/dashboard" 
                    className={`sidebar-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}
                  >
                    <Lock size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Admin Console</span>}
                  </Link>

                  <Link 
                    href="/admin/analytics" 
                    className={`sidebar-link ${pathname === '/admin/analytics' ? 'active' : ''}`}
                  >
                    <BarChart2 size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>SentinelPulse</span>}
                  </Link>

                  <Link 
                    href="/admin/escalations" 
                    className={`sidebar-link ${pathname === '/admin/escalations' ? 'active' : ''}`}
                  >
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Escalation &amp; SLA</span>}
                  </Link>

                  <Link 
                    href="/admin/categories" 
                    className={`sidebar-link ${pathname === '/admin/categories' ? 'active' : ''}`}
                  >
                    <GitFork size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Categories &amp; Routing</span>}
                  </Link>

                  <Link 
                    href="/admin/users" 
                    className={`sidebar-link ${pathname === '/admin/users' ? 'active' : ''}`}
                  >
                    <Users size={20} style={{ flexShrink: 0 }} />
                    {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>User Management</span>}
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Bottom Section: Profile Card & Logout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderTop: '1px solid #dadad3' }}>
            {/* User Profile Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 12px 4px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e60023', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
              {isHovered && (
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, animation: 'fadeIn 0.15s ease-out' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#262622', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userName}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{userRole}</span>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="sidebar-link sidebar-logout"
            >
              <LogOut size={20} style={{ flexShrink: 0 }} />
              {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Logout</span>}
            </button>
          </div>
        </aside>
      </>
    )
  }

  // 2. Citizen Vertical Sidebar View
  if (isCitizen) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            padding-left: 64px !important;
            transition: padding-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            color: #64748b !important;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            background: transparent !important;
            border-left: 4px solid transparent;
            transition: all 150ms ease-in-out;
            white-space: nowrap;
            width: 100%;
            cursor: pointer;
            box-sizing: border-box;
          }
          .sidebar-link:hover {
            color: #262622 !important;
            background: #f6f6f3 !important;
          }
          .sidebar-link.active {
            color: #e60023 !important;
            background: #f6f6f3 !important;
            border-left: 4px solid #e60023 !important;
            font-weight: 700;
          }
          .sidebar-logout {
            color: #ef4444 !important;
          }
          .sidebar-logout:hover {
            background: rgba(239, 68, 68, 0.08) !important;
            color: #ef4444 !important;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-6px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}} />

        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={sidebarStyle}
        >
          {/* Top Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
            <Link 
              href="/citizen/home" 
              style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '0 8px',
                height: '56px',
                overflow: 'hidden'
              }}
            >
              {isHovered ? (
                <img 
                  src="/Logos/RL_Transparent.png" 
                  alt="KSP CIAP" 
                  style={{ height: '48px', objectFit: 'contain', animation: 'fadeIn 0.15s ease-out' }} 
                />
              ) : (
                <img 
                  src="/Logos/SL_Transparent.png" 
                  alt="KSP" 
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }} 
                />
              )}
            </Link>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
              <Link 
                href="/citizen/home" 
                className={`sidebar-link ${pathname === '/citizen/home' ? 'active' : ''}`}
              >
                <Home size={20} style={{ flexShrink: 0 }} />
                {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Citizen Home</span>}
              </Link>

              <Link 
                href="/citizen/complaints" 
                className={`sidebar-link ${pathname?.startsWith('/citizen/complaints') ? 'active' : ''}`}
              >
                <ClipboardList size={20} style={{ flexShrink: 0 }} />
                {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>My Complaints</span>}
              </Link>

              <Link 
                href="/citizen/complaint/new" 
                className={`sidebar-link ${pathname === '/citizen/complaint/new' ? 'active' : ''}`}
              >
                <FilePlus size={20} style={{ flexShrink: 0 }} />
                {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Raise Complaint</span>}
              </Link>

              <Link 
                href="/citizen/track" 
                className={`sidebar-link ${pathname === '/citizen/track' ? 'active' : ''}`}
              >
                <Search size={20} style={{ flexShrink: 0 }} />
                {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Track by ID</span>}
              </Link>
            </nav>
          </div>

          {/* Bottom Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderTop: '1px solid #dadad3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 12px 4px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e60023', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
              {isHovered && (
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, animation: 'fadeIn 0.15s ease-out' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#262622', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userName}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{userRole}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="sidebar-link sidebar-logout"
            >
              <LogOut size={20} style={{ flexShrink: 0 }} />
              {isHovered && <span style={{ animation: 'fadeIn 0.15s ease-out' }}>Logout</span>}
            </button>
          </div>
        </aside>
      </>
    )
  }

  // 3. Public Top Horizontal View (Landing / Login / etc.)
  return (
    <header style={headerStyle}>
      <Link 
        href="/" 
        style={{ 
          textDecoration: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          height: '40px' 
        }}
      >
        <img 
          src="/Logos/RL_Transparent.png" 
          alt="KSP CIAP" 
          style={{ height: '42px', objectFit: 'contain' }} 
        />
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link 
          href="/login" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#e60023', // Pinterest Red
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '16px',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 700,
            transition: 'opacity 150ms'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Login
        </Link>
      </div>
    </header>
  )
}
