import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PRAJA — Raise & Track Civic Complaints',
  description: 'Submit, track, and resolve public grievances transparently. One platform connecting citizens, officers, and administrators.',
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  container: { maxWidth: '1366px', margin: '0 auto', padding: '0 32px' } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'var(--color-primary)', color: 'var(--color-on-primary)',
    padding: '12px 24px', height: '44px', borderRadius: 'var(--rounded-md)',
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px',
    letterSpacing: '0.7px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'background 150ms',
  } as React.CSSProperties,
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'var(--color-canvas)', color: 'var(--color-ink)',
    padding: '12px 24px', height: '44px', borderRadius: 'var(--rounded-md)',
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px',
    letterSpacing: '0.7px', textTransform: 'uppercase' as const,
    textDecoration: 'none', border: '1px solid var(--color-ink)', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
}


// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-hairline)',
    }}>
      <div style={{ ...S.container, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Image src="/logo-square.jpg" alt="PRAJA" width={48} height={48} style={{ borderRadius: '8px', objectFit: 'cover' }} priority />
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {['Home', 'Track Complaint', 'Help'].map(label => (
            <a key={label} href={label === 'Track Complaint' ? '/citizen/track' : '#'} style={{
              padding: '8px 16px', color: 'var(--color-ink)', fontSize: '16px', fontWeight: 400,
              textDecoration: 'none', borderRadius: 'var(--rounded-lg)', transition: 'background 140ms',
            }}>
              {label}
            </a>
          ))}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-hairline)', margin: '0 8px' }} />
          <Link href="/login" style={S.btnPrimary}>Sign In</Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ padding: '80px 0', background: 'var(--color-canvas)', overflow: 'hidden' }}>
      <div style={{ ...S.container, position: 'relative' }}>
        {/* Chevron decorations — HP signature blue slashes */}
        <div style={{
          position: 'absolute', left: '-48px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '28px', height: '220px', background: 'var(--color-primary)', borderRadius: 'var(--rounded-none)',
          opacity: 0.9,
        }} />
        <div style={{
          position: 'absolute', left: '-24px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '12px', height: '220px', background: 'var(--color-primary)', borderRadius: 'var(--rounded-none)',
          opacity: 0.4,
        }} />

        {/* Main hero card */}
        <div style={{
          background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
          border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-soft-lift)',
          padding: '56px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '64px', alignItems: 'center',
        }}>
          {/* Left: copy */}
          <div>
            <div style={{ marginBottom: '24px' }}>
            <Image src="/logo-square.jpg" alt="PRAJA" width={96} height={96} style={{ borderRadius: '12px', objectFit: 'cover' }} priority />
          </div>
          <div style={{
            display: 'inline-block', padding: '4px 10px', marginBottom: '20px',
            borderRadius: 'var(--rounded-lg)', background: 'var(--color-cloud)',
            fontSize: '12px', fontWeight: 600, color: 'var(--color-charcoal)', letterSpacing: '0.3px',
          }}>
            Citizen Grievance &amp; Governance · India
          </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '56px',
              lineHeight: 1.0, color: 'var(--color-ink)', letterSpacing: '-0.5px', marginBottom: '20px',
            }}>
              Raise civic issues quickly. Track every step transparently.
            </h1>
            <p style={{ fontSize: '18px', fontWeight: 400, color: 'var(--color-charcoal)', lineHeight: 1.33, marginBottom: '36px', maxWidth: '440px' }}>
              PRAJA connects citizens, officers, and admins in one transparent workflow — from complaint filing to final resolution.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/citizen/complaint/new" id="cta-raise-complaint" style={S.btnPrimary}>
                📝 Raise a Complaint
              </Link>
              <Link href="/citizen/track" id="cta-track-complaint" style={S.btnOutline}>
                🔍 Track Complaint
              </Link>
            </div>
          </div>

          {/* Right: live complaint card mockup */}
          <div>
            <div style={{
              background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
              border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-soft-lift)', padding: '28px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', marginBottom: '2px' }}>Road Pothole — MG Road</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-graphite)', fontFamily: 'monospace' }}>#PRJ-2024-0091</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 'var(--rounded-lg)', background: 'var(--color-cloud)', fontSize: '11px', fontWeight: 700, color: 'var(--color-charcoal)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>In Progress</span>
              </div>

              {[
                { icon: '✅', label: 'Complaint filed', sub: 'Jun 5, 10:30 AM', done: true },
                { icon: '📬', label: 'Routed to PWD Dept', sub: 'Jun 5, 11:00 AM', done: true },
                { icon: '⚙️', label: 'Officer assigned', sub: 'Jun 6, 9:00 AM', done: true },
                { icon: '🔄', label: 'Resolution in progress', sub: 'Expected Jun 10', done: false },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: i < 3 ? '14px' : 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    border: `1px solid ${t.done ? '#86EFAC' : 'var(--color-hairline)'}`,
                    background: t.done ? '#F0FDF4' : 'var(--color-cloud)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                  }}>
                    {t.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: t.done ? 500 : 400, color: t.done ? 'var(--color-ink)' : 'var(--color-graphite)' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-steel)' }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px',
              padding: '10px 16px', borderRadius: 'var(--rounded-lg)',
              background: 'var(--color-primary)', color: '#ffffff',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px',
              boxShadow: 'var(--shadow-soft-lift)',
            }}>
              <Image src="/logo-square.jpg" alt="" width={24} height={24} style={{ borderRadius: '4px', objectFit: 'cover' }} />
              PRAJA — Every complaint accountable
            </div>
          </div>
        </div>

        {/* Right chevrons */}
        <div style={{
          position: 'absolute', right: '-24px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '12px', height: '220px', background: 'var(--color-primary)', opacity: 0.4,
        }} />
        <div style={{
          position: 'absolute', right: '-48px', top: '50%', transform: 'translateY(-50%) skewX(-18deg)',
          width: '28px', height: '220px', background: 'var(--color-primary)', opacity: 0.9,
        }} />
      </div>
    </section>
  )
}

// ─── Trust strip ───────────────────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: '📡', label: 'Real-time tracking' },
    { icon: '🏢', label: 'Auto dept. routing' },
    { icon: '🔒', label: 'Aadhaar-secured' },
    { icon: '🌐', label: 'Multilingual ready' },
    { icon: '📊', label: 'Transparent updates' },
    { icon: '⚡', label: 'Fast resolution flow' },
  ]
  return (
    <section style={{ background: 'var(--color-cloud)', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)', padding: '20px 32px' }}>
      <div style={{ maxWidth: '1366px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px' }}>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--color-charcoal)', whiteSpace: 'nowrap' }}>
            <span>{item.icon}</span>{item.label}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', icon: '📝', title: 'Submit your issue', desc: 'Fill a short form with your complaint, location, and category. Attach photos if needed. Takes under 2 minutes.' },
    { n: '02', icon: '🔀', title: 'PRAJA routes it', desc: 'Your complaint is automatically assigned to the right department — PWD, sanitation, electricity, or any civic body.' },
    { n: '03', icon: '✅', title: 'Track until resolved', desc: 'Follow every status update in real time. Get notified when an officer is assigned and when the issue is closed.' },
  ]
  return (
    <section style={{ padding: 'var(--space-section) 0', background: 'var(--color-canvas)' }}>
      <div style={S.container}>
        <div style={{ marginBottom: '56px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>How it works</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '44px', lineHeight: 1.0, color: 'var(--color-ink)', maxWidth: '480px' }}>
            From complaint to resolution in 3 steps
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{
              background: 'var(--color-canvas)', borderRadius: 'var(--rounded-xl)',
              border: '1px solid var(--color-hairline)', padding: '32px 28px',
              boxShadow: 'var(--shadow-soft-lift)', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', fontFamily: 'monospace', fontSize: '36px', fontWeight: 700, color: 'var(--color-fog)', lineHeight: 1 }}>{s.n}</div>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--rounded-lg)', background: 'var(--color-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '20px' }}>{s.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px', color: 'var(--color-ink)', marginBottom: '10px', lineHeight: 1.1 }}>{s.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Public value — dark ink slab ──────────────────────────────────────────────
function PublicValueSection() {
  const values = [
    { icon: '🚫🏃', title: 'No office running', desc: 'File from your phone, any time. No queues, no paperwork, no middlemen.' },
    { icon: '📍', title: 'One place for everything', desc: 'All your complaints, current and past, in a single dashboard with full history.' },
    { icon: '👁️', title: 'Real visibility', desc: 'Know exactly which department has your complaint and who is handling it.' },
    { icon: '⚡', title: 'Faster resolution', desc: 'Smart routing eliminates delays. Issues reach the right desk immediately.' },
  ]
  return (
    <section style={{ background: 'var(--color-ink)', padding: 'var(--space-section) 0' }}>
      <div style={S.container}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-bright)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Why PRAJA</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '44px', lineHeight: 1.0, color: 'var(--color-on-ink)', marginBottom: '20px' }}>
              Government services built for real citizens.
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--color-steel)', lineHeight: 1.5, marginBottom: '36px' }}>
              PRAJA replaces the frustrating cycle of visiting offices and never knowing the status — with one transparent digital workflow.
            </p>
            <Link href="/citizen/complaint/new" style={{ ...S.btnPrimary, background: 'var(--color-primary-bright)' }}>
              📝 File your first complaint →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {values.map((v, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--rounded-xl)',
                border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>{v.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-on-ink)', marginBottom: '8px' }}>{v.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-graphite)', lineHeight: 1.5 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CTA — cloud band ──────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ background: 'var(--color-cloud)', padding: 'var(--space-section) 0' }}>
      <div style={{ ...S.container, textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Ready to start</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '44px', lineHeight: 1.0, color: 'var(--color-ink)', marginBottom: '16px' }}>
          Your voice, officially heard.
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--color-charcoal)', lineHeight: 1.5, marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px' }}>
          Join citizens using PRAJA to hold local bodies accountable and get civic issues resolved faster.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/citizen/complaint/new" id="cta-banner-raise" style={S.btnPrimary}>📝 Raise a Complaint</Link>
          <Link href="/citizen/track" style={S.btnOutline}>🔍 Track Existing</Link>
        </div>
      </div>
    </section>
  )
}

// ─── Help band dark ────────────────────────────────────────────────────────────
function HelpBand() {
  const tabs = ['Browse Topics', 'Contact Us', 'Platform FAQs', 'Accessibility']
  return (
    <section style={{ background: 'var(--color-ink)', padding: '64px 0' }}>
      <div style={{ ...S.container, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '32px', color: 'var(--color-on-ink)', marginBottom: '32px' }}>
          How can we help?
        </h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <a key={tab} href="#" style={{
              padding: '8px 20px', borderRadius: 'var(--rounded-pill)',
              background: 'rgba(255,255,255,0.08)', color: 'var(--color-on-ink)',
              fontWeight: 500, fontSize: '14px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)',
              transition: 'background 140ms',
            }}>{tab}</a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer dark ───────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { heading: 'Platform', links: ['Raise Complaint', 'Track Status', 'My Dashboard', 'Sign In'] },
    { heading: 'Support', links: ['How it Works', 'FAQ', 'Contact Help', 'Accessibility'] },
    { heading: 'Legal', links: ['Privacy Policy', 'Terms of Use', 'Data Policy', 'About PRAJA'] },
    { heading: 'Connect', links: ['Twitter / X', 'LinkedIn', 'GitHub', 'Press Kit'] },
  ]
  return (
    <footer style={{ background: 'var(--color-ink)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 0 32px' }}>
      <div style={S.container}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
          {/* Brand */}
          <div>            <div style={{ marginBottom: '16px' }}>
              <Image src="/logo-square.jpg" alt="PRAJA" width={56} height={56} style={{ borderRadius: '8px', objectFit: 'cover' }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-graphite)', lineHeight: 1.6, maxWidth: '220px' }}>
              Transparent civic grievance resolution — connecting citizens, officers, and administrators.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.heading}>
              <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-steel)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '16px' }}>{col.heading}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ fontSize: '14px', color: 'var(--color-graphite)', textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-graphite)' }}>© 2026 PRAJA. Built for transparent civic governance.</p>
          <p style={{ fontSize: '12px', color: 'var(--color-steel)' }}>Demo environment · All data is fictitious</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main style={{ background: 'var(--color-canvas)' }}>
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <PublicValueSection />
      <CTABanner />
      <HelpBand />
      <Footer />
    </main>
  )
}

