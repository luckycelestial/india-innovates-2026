import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KSP CIAP — Karnataka State Police Crime Intelligence & Analytical Platform',
  description: 'State-of-the-art Crime Intelligence Platform. Spatiotemporal DBSCAN hotspotting, criminological link relationship analysis, and predictive socio-economic risk modeling.',
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  container: { maxWidth: '1366px', margin: '0 auto', padding: '0 32px' } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: '#1e3a8a', color: '#ffffff',
    padding: '12px 24px', height: '44px', borderRadius: '8px',
    fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '13px',
    letterSpacing: '0.8px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
    transition: 'all 150ms ease-in-out',
  } as React.CSSProperties,
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'transparent', color: '#1e3a8a',
    padding: '12px 24px', height: '44px', borderRadius: '8px',
    fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '13px',
    letterSpacing: '0.8px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: '2px solid #1e3a8a', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 150ms ease-in-out',
  } as React.CSSProperties,
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#ffffff', borderBottom: '1px solid #e2e8f0',
    }}>
      <div style={{ ...S.container, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo and Wordmark */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/logo-square.jpg" alt="KSP" width={40} height={40} style={{ borderRadius: '6px', objectFit: 'cover' }} priority />
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#1e3a8a', letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>KSP CIAP</span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/login" style={S.btnPrimary}>👮 Analyst Log In</Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ padding: '80px 0', background: '#f8fafc', overflow: 'hidden' }}>
      <div style={{ ...S.container, position: 'relative' }}>
        
        {/* Navy and Gold accents */}
        <div style={{
          position: 'absolute', left: '-48px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '24px', height: '260px', background: '#1e3a8a', opacity: 0.9,
        }} />
        <div style={{
          position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '10px', height: '260px', background: '#eab308', opacity: 0.8,
        }} />

        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          padding: '56px 64px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr',
          gap: '64px', alignItems: 'center',
        }}>
          {/* Left Block */}
          <div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', marginBottom: '20px',
              borderRadius: '20px', background: '#eff6ff', border: '1px solid #bfdbfe',
              fontSize: '12px', fontWeight: 700, color: '#1e3a8a', letterSpacing: '0.5px',
            }}>
              🇮🇳 Karnataka State Police · Crime Intelligence Unit
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '46px',
              lineHeight: 1.1, color: '#0f172a', letterSpacing: '-1px', marginBottom: '20px',
            }}>
              Karnataka State Police Crime Intelligence & Analytical Platform
            </h1>
            <p style={{ fontSize: '16px', fontWeight: 500, color: '#475569', lineHeight: 1.5, marginBottom: '36px' }}>
              Advanced analytics suite providing spatiotemporal hotspotting, Jaccard Modus Operandi matching, criminological link diagramming, and Isolation Forest anomaly indicators.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link href="/login" id="cta-enter-portal" style={S.btnPrimary}>
                👮 Enter CIAP Portal
              </Link>
              <Link href="/login" style={S.btnOutline}>
                🗺️ View Live Hotspots
              </Link>
            </div>
          </div>

          {/* Right Block: Live Dashboard Mockup preview */}
          <div style={{
            background: '#0f172a', borderRadius: '14px',
            border: '1.5px solid #334155', boxShadow: '0 20px 40px rgba(15,23,42,0.3)', padding: '24px',
            color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.4
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
              <span style={{ color: '#eab308', fontWeight: 700 }}>● KSP SYSTEM HEALTH</span>
              <span style={{ color: '#10b981' }}>ONLINE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>[ST-DBSCAN] Active clusters initialized: <span style={{ color: '#a78bfa' }}>4 areas</span></div>
              <div>[Jaccard] MO similarity filter status: <span style={{ color: '#38bdf8' }}>Ready</span></div>
              <div>[IsolationForest] Anomaly detection rate: <span style={{ color: '#f87171' }}>12%</span></div>
              <div style={{ margin: '8px 0', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <strong>CRIME SERIES DETECTED:</strong>
                <div style={{ color: '#a78bfa', marginLeft: '8px', marginTop: '4px' }}>
                  • Series #02: Theft cases Mysuru (90% similarity)
                </div>
                <div style={{ color: '#f87171', marginLeft: '8px', marginTop: '2px' }}>
                  • Anomaly KSP-2026-1002: Narcotics (daytime spike)
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '9px', marginTop: '12px' }}>
                LAST COMPLETED SYNC: TODAY, 08:30 AM
              </div>
            </div>
          </div>
        </div>

        {/* Right accents */}
        <div style={{
          position: 'absolute', right: '-24px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '10px', height: '260px', background: '#eab308', opacity: 0.8,
        }} />
        <div style={{
          position: 'absolute', right: '-48px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '24px', height: '260px', background: '#1e3a8a', opacity: 0.9,
        }} />
      </div>
    </section>
  )
}

// ─── Trust strip ───────────────────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: '🛰️', label: 'ST-DBSCAN Hotspotting' },
    { icon: '👥', label: 'Network Link Diagrams' },
    { icon: '🌲', label: 'Isolation Forest Anomalies' },
    { icon: '📅', label: 'Temporal Rhythms' },
    { icon: '🗺️', label: 'Karnataka GIS Boundaries' },
    { icon: '🔒', label: 'Aadhaar Secured Demo' },
  ]
  return (
    <section style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '20px 32px' }}>
      <div style={{ maxWidth: '1366px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px' }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
            <span>{item.icon}</span>{item.label}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Features ──────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const steps = [
    { n: '01', icon: '🛰️', title: 'Spatiotemporal Hotspotting', desc: 'Custom DBSCAN clusters incidents across latitude, longitude, and timestamps to isolate active risk bubbles.' },
    { n: '02', icon: '🕵️', title: 'Modus Operandi Graph Match', desc: 'Evaluates Jaccard similarities on tool usage and break-in methodologies to link recurring crime rings.' },
    { n: '03', icon: '🌲', title: 'Isolation Forest Anomalies', desc: 'Scores atypical incidents (e.g. unique daytime spikes) to isolate outliers from nominal crime rates.' },
  ]
  return (
    <section style={{ padding: '80px 0', background: '#ffffff' }}>
      <div style={S.container}>
        <div style={{ marginBottom: '56px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Analytics Capabilities</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '38px', lineHeight: 1.1, color: '#0f172a', maxWidth: '540px' }}>
            Next-Generation Criminology Engine
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{
              background: '#ffffff', borderRadius: '12px',
              border: '1px solid #e2e8f0', padding: '32px 28px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', fontFamily: 'monospace', fontSize: '32px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{s.n}</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>{s.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>{s.title}</h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid #1e293b', padding: '48px 0 24px' }}>
      <div style={S.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image src="/logo-square.jpg" alt="KSP" width={40} height={40} style={{ borderRadius: '6px', objectFit: 'cover' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', letterSpacing: '0.5px' }}>KSP CIAP</span>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Karnataka State Police Crime Intelligence &amp; Analytical Platform</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            © 2026 KSP CIAP. Authorized personnel only.
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main style={{ background: '#ffffff' }}>
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
