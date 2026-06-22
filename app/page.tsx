import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { 
  Compass, BarChart3, Database, MessageSquare, 
  Clock, ShieldAlert, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nagaragupta — Unified Civic Intelligence Platform',
  description: 'Smart city monitoring and civic response platform. Integrating live API feeds, open datasets, and citizen complaints into a unified operational view.',
}

const FONT_SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  container: { maxWidth: '1280px', margin: '0 auto', padding: '0 24px' } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: '#e60023', color: '#ffffff',
    padding: '12px 24px', height: '44px', borderRadius: '16px',
    fontFamily: FONT_SANS, fontWeight: 700, fontSize: '13px',
    letterSpacing: '0.8px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    boxShadow: '0 4px 12px rgba(230, 0, 35, 0.25)',
    transition: 'all 150ms ease-in-out',
  } as React.CSSProperties,
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'transparent', color: '#e60023',
    padding: '12px 22px', height: '44px', borderRadius: '16px',
    fontFamily: FONT_SANS, fontWeight: 700, fontSize: '13px',
    letterSpacing: '0.8px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: '2px solid #e60023', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 150ms ease-in-out',
  } as React.CSSProperties,
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#262622', borderBottom: '1px solid #dadad3',
      height: '64px', display: 'flex', alignItems: 'center'
    }}>
      <div style={{ ...S.container, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Branding */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#e60023', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>
            N
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#ffffff', letterSpacing: '0.5px', fontFamily: FONT_SANS }}>
            Nagaragupta
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/login" style={S.btnPrimary}>👮 Analyst Log In</Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ padding: '80px 0', background: '#f6f6f3', borderBottom: '1px solid #dadad3' }}>
      <div style={S.container}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 0.8fr',
          gap: '48px', alignItems: 'center',
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #dadad3', padding: '48px',
          boxShadow: '0 4px 20px rgba(4,4,6,0.03)'
        }}>
          {/* Left: Text copy */}
          <div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', marginBottom: '16px',
              borderRadius: '20px', background: '#f6f6f3', border: '1px solid #dadad3',
              fontSize: '11px', fontWeight: 700, color: '#000000', letterSpacing: '0.5px',
            }}>
              Unified Civic Intelligence Platform
            </div>
            
            <h1 style={{
              fontFamily: FONT_SANS, fontWeight: 800, fontSize: '42px',
              lineHeight: 1.1, color: '#000000', letterSpacing: '-0.8px', marginBottom: '16px'
            }}>
              See the whole city.<br/>
              <span style={{ color: '#e60023' }}>Act with clarity.</span>
            </h1>

            <p style={{ fontSize: '15px', color: '#000000', lineHeight: 1.5, marginBottom: '32px', fontWeight: 500 }}>
              Nagaragupta brings together three critical data streams into a single operational view: live API feeds, open public datasets, and citizen complaints to drive proactive civic responses.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/login" style={S.btnPrimary}>
                👮 Enter Portal <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </Link>
              <Link href="/login" style={S.btnOutline}>
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: Mockup Dashboard Visual */}
          <div style={{
            background: '#262622', borderRadius: '16px',
            border: '1.5px solid #dadad3', padding: '24px',
            color: '#ffffff', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '14px' }}>
              <span style={{ color: '#7B8F65', fontWeight: 700 }}>● NAGARAGUPTA MONITOR</span>
              <span style={{ color: '#6D9998' }}>LIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>[API] Live feeds: <span style={{ color: '#6D9998' }}>AQI, weather active</span></div>
              <div>[OpenCity] Dataset registry: <span style={{ color: '#7B8F65' }}>CKAN connected</span></div>
              <div>[Citizen] Pending grievances: <span style={{ color: '#e60023' }}>4 active</span></div>
              <div style={{ margin: '8px 0', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                <strong>Active Interfaces:</strong>
                <div style={{ color: 'rgba(255,255,255,0.8)', marginLeft: '8px', marginTop: '4px' }}>
                  • Citizen Complaint Intake Portal
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', marginLeft: '8px', marginTop: '2px' }}>
                  • ICCC Official Action Board
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Connected Experiences ─────────────────────────────────────────────────────
function ConnectedExperiences() {
  return (
    <section style={{ padding: '64px 0', background: '#ffffff', borderBottom: '1px solid #dadad3' }}>
      <div style={S.container}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e60023', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Connected Experiences
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#000000', marginTop: '8px' }}>
            Two Workspaces. One Unified Flow.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Citizen Portal Card */}
          <div style={{
            background: '#f6f6f3', border: '1px solid #dadad3',
            borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e60023' }}>
              <MessageSquare size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: 0 }}>Citizen Portal</h3>
            <p style={{ fontSize: '13px', color: '#000000', lineHeight: 1.5, margin: 0 }}>
              Filing complaints made simple. Allows citizens to report local civic issues (roads, lights, water), upload photos, lock coordinate locations, and track progress transparently.
            </p>
          </div>

          {/* Official Dashboard Card */}
          <div style={{
            background: '#262622', border: '1px solid #dadad3',
            borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#ffffff'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#e60023', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Compass size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' }}>Official Dashboard</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: 0 }}>
              Command center for city operations. Officials view live condition maps, run spatial DBSCAN hotspotting, track department SLA metrics, and coordinate response pipelines.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Core Data Layers ──────────────────────────────────────────────────────────
function CoreDataLayers() {
  const layers = [
    {
      title: 'Live Feeds',
      desc: 'Real-time environmental streams including weather patterns, air quality indices, and traffic densities via WAQI and Google APIs.',
      icon: Clock,
      color: '#6D9998'
    },
    {
      title: 'Open Datasets',
      desc: 'Municipal registries, vehicle statistics, and traffic logs fetched dynamically from open platforms and CKAN registries.',
      icon: Database,
      color: '#7B8F65'
    },
    {
      title: 'Citizen Complaints',
      desc: 'Local grievances reported directly by residents with media attachments, localized categories, and coordinates.',
      icon: MessageSquare,
      color: '#e60023'
    },
    {
      title: 'Internal Workflows',
      desc: 'ICCC queues, SLA monitoring, and response logs generated automatically by team assignments and status shifts.',
      icon: ShieldAlert,
      color: '#262622'
    }
  ]
  return (
    <section style={{ padding: '64px 0', background: '#f6f6f3', borderBottom: '1px solid #dadad3' }}>
      <div style={S.container}>
        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e60023', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Core Data Layers
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#000000', marginTop: '8px' }}>
            Integrated Intelligence Streams
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {layers.map(layer => {
            const Icon = layer.icon
            return (
              <div key={layer.title} style={{
                background: '#ffffff', borderRadius: '16px',
                border: '1px solid #dadad3', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ color: layer.color }}>
                  <Icon size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#000000', margin: 0 }}>{layer.title}</h4>
                <p style={{ fontSize: '12px', color: '#000000', lineHeight: 1.5, margin: 0 }}>{layer.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Key Features ──────────────────────────────────────────────────────────────
function KeyFeatures() {
  const features = [
    'Map-based city operations dashboard',
    'Ward-wise complaint heatmaps',
    'Duplicate complaint clustering',
    'AI-assisted urgency scoring',
    'Dataset explorer for officials',
    'Citizen complaint filing and tracking',
    'Trend analytics across departments',
    'Alert rules for live conditions',
    'Public-facing non-sensitive city indicators'
  ]
  return (
    <section style={{ padding: '64px 0', background: '#ffffff', borderBottom: '1px solid #dadad3' }}>
      <div style={S.container}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '48px', alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e60023', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Key Features
            </span>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#000000', marginTop: '8px', marginBottom: '16px' }}>
              Built for city analytics.
            </h2>
            <p style={{ fontSize: '14px', color: '#000000', lineHeight: 1.5, marginBottom: '24px' }}>
              Nagaragupta is not just another complaint portal. It is a **civic intelligence layer** sitting above existing smart city databases to coordinate resolution workflows.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {features.map((feat, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'start', gap: '10px',
                background: '#f6f6f3', border: '1px solid #dadad3',
                padding: '16px', borderRadius: '16px'
              }}>
                <CheckCircle2 size={16} style={{ color: '#e60023', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#000000' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#262622', borderTop: '1px solid #dadad3', padding: '48px 0 24px', color: '#ffffff' }}>
      <div style={S.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#e60023', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>
              N
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', letterSpacing: '0.5px' }}>Nagaragupta</span>
              <div style={{ fontSize: '11px', color: '#dadad3', marginTop: '2px' }}>Unified Civic Intelligence Platform</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#dadad3' }}>
            © 2026 Nagaragupta CIAP. Demo environment. All data is fictitious.
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main style={{ background: '#ffffff', fontFamily: FONT_SANS }}>
      <HeroSection />
      <ConnectedExperiences />
      <CoreDataLayers />
      <KeyFeatures />
      <Footer />
    </main>
  )
}
