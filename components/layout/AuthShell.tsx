'use client'

import React from 'react'
import Link from 'next/link'

type AuthShellProps = {
  children: React.ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f6f6f3', // Page background color
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <div className="auth-container" style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '48px',
        alignItems: 'center',
      }}>
        {/* Left Side: Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: '#e60023',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '22px'
            }}>
              N
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: '24px',
              color: '#000000',
              letterSpacing: '0.5px'
            }}>
              Nagaragupta
            </span>
          </Link>

          <div>
            <h1 style={{
              fontWeight: 800,
              fontSize: '36px',
              lineHeight: 1.15,
              color: '#000000',
              letterSpacing: '-0.8px',
              marginBottom: '16px'
            }}>
              See the whole city.<br />
              <span style={{ color: '#e60023' }}>Act with clarity.</span>
            </h1>
            <p style={{
              fontSize: '15px',
              color: '#000000',
              lineHeight: 1.6,
              fontWeight: 500,
              maxWidth: '440px',
              margin: 0
            }}>
              Nagaragupta brings together live city data, open datasets, and citizen complaints into a single operational view.
            </p>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '16px',
            background: 'rgba(230, 0, 35, 0.06)',
            border: '1px solid rgba(230, 0, 35, 0.15)',
            fontSize: '12px',
            color: '#e60023',
            fontWeight: 600,
            width: 'fit-content'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#e60023',
              display: 'inline-block'
            }} />
            Unified Civic Intelligence Platform
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #dadad3',
          boxShadow: '0 4px 20px rgba(4, 4, 6, 0.05)',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-container {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </main>
  )
}
