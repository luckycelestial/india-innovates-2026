'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Search, Bell, ChevronDown, Maximize2, Fuel, 
  TrendingUp, Compass, Calendar, SlidersHorizontal, MapPin
} from 'lucide-react'

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

interface Order {
  id: string
  customer: string
  fromCity: string
  toCity: string
  weight: string
  eta: string
  status: 'In Transit' | 'Picked Up' | 'Delivered' | 'Pending'
}

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-9421', customer: 'Acme Corp', fromCity: 'Boston, MA', toCity: 'New York, NY', weight: '12,400 lbs', eta: '2.5 hrs', status: 'In Transit' },
  { id: 'ORD-9422', customer: 'Global Logix', fromCity: 'Philadelphia, PA', toCity: 'South Bronx, NY', weight: '8,200 lbs', eta: '1.2 hrs', status: 'In Transit' },
  { id: 'ORD-9423', customer: 'Summit Goods', fromCity: 'Newark, NJ', toCity: 'Brooklyn, NY', weight: '15,100 lbs', eta: '45 mins', status: 'Picked Up' },
  { id: 'ORD-9424', customer: 'Prime Trade', fromCity: 'New Haven, CT', toCity: 'Queens, NY', weight: '6,500 lbs', eta: 'Delivered', status: 'Delivered' },
  { id: 'ORD-9425', customer: 'Apex Freight', fromCity: 'Hartford, CT', toCity: 'Manhattan, NY', weight: '18,900 lbs', eta: '3.8 hrs', status: 'In Transit' },
]

const MOCK_PINS = [
  { id: 'ORD-9421', lat: 40.8250, lng: -73.9200, cargo: 'Electronics', weight: '12,400 lbs' },
  { id: 'ORD-9422', lat: 40.8120, lng: -73.9010, cargo: 'Perishable Goods', weight: '8,200 lbs' },
  { id: 'ORD-9423', lat: 40.8350, lng: -73.9150, cargo: 'Machinery Parts', weight: '15,100 lbs' },
]

declare global {
  interface Window {
    L: any
  }
}

function NagaraguptaMap() {
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (window.L) {
      setMapLoaded(true)
    } else {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !window.L) return

    const container = document.getElementById('fleet-map-container')
    if (!container) return
    container.innerHTML = '<div id="fleet-actual-map" style="height: 100%; width: 100%; border-radius: 8px;"></div>'

    const L = window.L
    
    // Center on South Bronx, New York
    const map = L.map('fleet-actual-map').setView([40.8250, -73.9100], 13)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map)

    MOCK_PINS.forEach(pin => {
      // Custom square truck pin marker
      const customIcon = L.divIcon({
        className: 'custom-fleet-pin',
        html: `
          <div style="
            background: #040406; 
            border: 2px solid #0820A6; 
            color: #ffffff; 
            font-weight: 700; 
            font-size: 10px; 
            padding: 4px 6px; 
            border-radius: 4px; 
            white-space: nowrap; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            🚚 <span>${pin.id}</span>
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      })

      L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map).bindPopup(`
        <div style="font-family: ${FONT_SANS}; min-width: 150px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #0820A6;">
            📦 Active Order: ${pin.id}
          </h4>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: #040406;">
            <span>Cargo: <strong>${pin.cargo}</strong></span>
            <span>Weight: <strong>${pin.weight}</strong></span>
          </div>
        </div>
      `)
    })

    return () => {
      map.remove()
    }
  }, [mapLoaded])

  return (
    <div style={{ position: 'relative', width: '100%', height: '360px', background: '#E7E6E6', borderRadius: '8px', overflow: 'hidden' }}>
      {!mapLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#040406', fontWeight: 600 }}>
          Initializing map canvas...
        </div>
      )}
      <div id="fleet-map-container" style={{ width: '100%', height: '100%' }}></div>
    </div>
  )
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'assigned' | 'completed'>('assigned')

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: '#E7E6E6', 
      fontFamily: FONT_SANS,
      color: '#040406',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* CSS Animations & Hover Styling */}
      <style>{`
        .nav-link {
          color: #C4BEC6;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 12px;
          transition: all 150ms ease;
        }
        .nav-link:hover {
          color: #FFFFFF;
        }
        .nav-link.active {
          color: #FFFFFF;
          font-weight: 700;
          border-bottom: 2px solid #0820A6;
        }
        .action-btn {
          cursor: pointer;
          transition: all 120ms;
        }
        .action-btn:hover {
          opacity: 0.8;
          transform: translateY(-1px);
        }
        .order-id-link {
          color: #0820A6;
          text-decoration: none;
          font-weight: 600;
        }
        .order-id-link:hover {
          text-decoration: underline;
        }
        .hatch-pattern-1 {
          background: repeating-linear-gradient(45deg, #0820A6, #0820A6 8px, #36375D 8px, #36375D 16px);
        }
        .hatch-pattern-2 {
          background: repeating-linear-gradient(45deg, #7B8F65, #7B8F65 8px, #E7E6E6 8px, #E7E6E6 16px);
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header style={{ 
        height: '64px', 
        background: '#36375D', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Left Side: Brand Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#0820A6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>
            N
          </div>
          <span style={{ 
            color: '#FFFFFF', 
            fontWeight: 800, 
            fontSize: '18px', 
            letterSpacing: '0.5px' 
          }}>
            Nagaragupta.
          </span>
        </div>

        {/* Center: Nav links */}
        <nav style={{ display: 'flex', gap: '8px', height: '100%', alignItems: 'center' }}>
          <Link href="/" className="nav-link active">Overview</Link>
          <Link href="/login" className="nav-link">Orders</Link>
          <Link href="/login" className="nav-link">Drivers</Link>
          <Link href="/login" className="nav-link">Documents</Link>
          <Link href="/login" className="nav-link">Finance</Link>
          <Link href="/login" className="nav-link">Analytics</Link>
        </nav>

        {/* Right Side: Search, Alerts, Profile info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{ background: 'transparent', border: 'none', color: '#C4BEC6', cursor: 'pointer' }}><Search size={18} /></button>
          <button style={{ background: 'transparent', border: 'none', color: '#C4BEC6', cursor: 'pointer', position: 'relative' }}>
            <Bell size={18} />
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', background: '#EF4444', borderRadius: '50%' }} />
          </button>
          
          <div style={{ width: '1px', height: '24px', background: '#C4BEC6', opacity: 0.3 }} />

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#6D9998', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: '14px' }}>
              JJ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Jacob Jones</span>
              <span style={{ fontSize: '11px', color: '#C4BEC6' }}>Dispatch Officer</span>
            </div>
            <ChevronDown size={14} style={{ color: '#C4BEC6' }} />
          </div>
        </div>
      </header>

      {/* Main Workspace (2-Column Grid) */}
      <div style={{
        flex: 1,
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* Left Column (Map & Table) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Interactive Fleet Map Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid #C4BEC6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#040406', margin: 0 }}>Live Dispatch Operations Map</h2>
                <span style={{ fontSize: '11px', color: '#C4BEC6', fontWeight: 600 }}>MONITORING DRIVERS REAL-TIME</span>
              </div>
              
              {/* Map controls mockup */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ fontSize: '11px', background: '#E7E6E6', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, color: '#040406', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Area:</span> <strong style={{ color: '#0820A6' }}>South Bronx, NY</strong>
                </div>
                <div style={{ fontSize: '11px', background: '#E7E6E6', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, color: '#040406' }}>
                  Filter: <strong style={{ color: '#0820A6' }}>In Transit</strong>
                </div>
              </div>
            </div>

            {/* Map Canvas */}
            <NagaraguptaMap />
          </div>

          {/* Deliveries & Orders List Table Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid #C4BEC6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            
            {/* Table Filters Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '4px', background: '#E7E6E6', padding: '3px', borderRadius: '8px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'completed', label: 'Completed' }
                ].map(tab => {
                  const isSelected = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isSelected ? '#040406' : 'transparent',
                        color: isSelected ? '#ffffff' : '#040406',
                        transition: 'all 120ms'
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ border: '1px solid #C4BEC6', background: 'transparent', height: '32px', width: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#040406' }}>
                  <Calendar size={14} />
                </button>
                <button style={{ border: '1px solid #C4BEC6', background: 'transparent', height: '32px', width: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#040406' }}>
                  <SlidersHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#C4BEC6', fontWeight: 600, borderBottom: '1px solid #C4BEC6' }}>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Route</th>
                  <th style={{ padding: '12px 16px' }}>Weight</th>
                  <th style={{ padding: '12px 16px' }}>ETA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ORDERS.map(order => (
                  <tr key={order.id} className="hover-row" style={{ borderBottom: '1px solid #E7E6E6', color: '#040406' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href="/login" className="order-id-link">{order.id}</Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{order.customer}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{order.fromCity}</span>
                        <span style={{ fontSize: '11px', color: '#C4BEC6' }}>→ {order.toCity}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{order.weight}</td>
                    <td style={{ padding: '14px 16px', color: order.eta === 'Delivered' ? '#7B8F65' : '#040406', fontWeight: order.eta === 'Delivered' ? 700 : 500 }}>
                      {order.eta}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{
                        color: order.status === 'In Transit' ? '#0820A6' : order.status === 'Delivered' ? '#7B8F65' : '#040406',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Column (Analytics & Cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status Performance Overview Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #C4BEC6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            position: 'relative'
          }}>
            <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#C4BEC6', cursor: 'pointer' }}>
              <Maximize2 size={16} />
            </button>
            
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#040406' }}>Status Performance Overview</h3>
            <span style={{ fontSize: '11px', color: '#C4BEC6', fontWeight: 600 }}>FLEET UTILIZATION CATEGORIES</span>

            {/* Custom accessible bar graph with pattern fills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              {[
                { label: 'Loading', pct: 42, color: '#0820A6', styleClass: 'hatch-pattern-1' },
                { label: 'In Transit', pct: 14, color: '#6D9998', styleClass: '' },
                { label: 'Unloading', pct: 25, color: '#040406', styleClass: '' },
                { label: 'Delivered', pct: 19, color: '#7B8F65', styleClass: 'hatch-pattern-2' }
              ].map(bar => (
                <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ color: '#040406' }}>{bar.label}</span>
                    <span style={{ color: '#040406' }}>{bar.pct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '18px', background: '#E7E6E6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className={bar.styleClass} 
                      style={{ 
                        width: `${bar.pct}%`, 
                        height: '100%', 
                        background: bar.styleClass ? undefined : bar.color,
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fuel Usage & Cost Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #C4BEC6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            position: 'relative'
          }}>
            <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#C4BEC6', cursor: 'pointer' }}>
              <Maximize2 size={16} />
            </button>

            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#040406' }}>Fuel Usage &amp; Cost</h3>
            <span style={{ fontSize: '11px', color: '#C4BEC6', fontWeight: 600 }}>CONSUMPTION METRICS</span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#C4BEC6', fontWeight: 600 }}>AVG EFFICIENCY</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#040406', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  7.4 <span style={{ fontSize: '14px', fontWeight: 500 }}>L/100km</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#C4BEC6', fontWeight: 600 }}>TOTAL SPEND</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0820A6', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  $21.4k <span style={{ fontSize: '12px', fontWeight: 700, color: '#7B8F65' }}>+6% MoM</span>
                </div>
              </div>
            </div>

            {/* Sparkline chart */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#C4BEC6', marginBottom: '8px' }}>
                <span>Sep</span>
                <span>Oct</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'end', height: '40px', background: '#f8fafc', padding: '4px', borderRadius: '6px' }}>
                {[12, 18, 15, 22, 28, 20, 24, 32, 29, 36, 42, 38].map((val, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      flex: 1, 
                      height: `${(val / 42) * 100}%`, 
                      background: idx === 10 ? '#0820A6' : '#C4BEC6', 
                      borderRadius: '2px' 
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Revenue Over Time Card (Gradient surface) */}
          <div style={{ 
            background: 'linear-gradient(135deg, #0820A6, #36375D)', 
            borderRadius: '12px', 
            padding: '24px',
            color: '#FFFFFF',
            boxShadow: '0 8px 20px rgba(8,32,166,0.15)',
            position: 'relative'
          }}>
            <button style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <Maximize2 size={16} />
            </button>

            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Revenue Over Time</h3>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>MONTHLY EARNINGS ASSESSMENT</span>

            <div style={{ marginTop: '20px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>ACCUMULATED VALUE</span>
              <h2 style={{ fontSize: '30px', fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.5px' }}>
                $281,161.00
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#7B8F65', marginTop: '4px' }}>
                <TrendingUp size={14} /> <span>+12.2% growth this month</span>
              </div>
            </div>

            {/* Glowing line area chart */}
            <div style={{ height: '80px', marginTop: '24px', position: 'relative' }}>
              <svg viewBox="0 0 100 30" width="100%" height="100%" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 25 C10 20, 20 22, 30 15 C40 8, 50 18, 60 10 C70 2, 80 12, 90 5 C95 2, 100 1, 100 1 L100 30 L0 30 Z" fill="url(#glow)" />
                <path d="M0 25 C10 20, 20 22, 30 15 C40 8, 50 18, 60 10 C70 2, 80 12, 90 5 C95 2, 100 1, 100 1" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Footer highlights */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '20px', 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              paddingTop: '16px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <div>
                <strong style={{ color: '#ffffff', display: 'block', fontSize: '13px' }}>178</strong>
                <span>New Client Accounts</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: '#ffffff', display: 'block', fontSize: '13px' }}>$35.8k</strong>
                <span>Peak Revenue Week</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer style={{ 
        height: '48px', 
        borderTop: '1px solid #C4BEC6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: '12px',
        color: '#C4BEC6',
        background: '#ffffff'
      }}>
        <span>© 2026 Nagaragupta Fleet Operations Console.</span>
        <span style={{ fontWeight: 600, color: '#040406' }}>Jacob Jones (Active Dispatch Session)</span>
      </footer>

    </main>
  )
}
