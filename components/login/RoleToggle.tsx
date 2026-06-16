'use client'

import React from 'react'

type RoleToggleProps = {
  activeRole: 'citizen' | 'official'
  onChange: (role: 'citizen' | 'official') => void
}

export default function RoleToggle({ activeRole, onChange }: RoleToggleProps) {
  return (
    <div style={{
      display: 'flex',
      background: '#f6f6f3',
      borderRadius: '30px',
      padding: '4px',
      border: '1px solid #dadad3',
      marginBottom: '16px'
    }}>
      <button
        onClick={() => onChange('citizen')}
        style={{
          flex: 1,
          border: 'none',
          padding: '10px 16px',
          borderRadius: '26px',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          background: activeRole === 'citizen' ? '#e60023' : 'transparent',
          color: activeRole === 'citizen' ? '#ffffff' : '#000000',
          transition: 'all 150ms ease-in-out',
        }}
      >
        Citizen
      </button>
      <button
        onClick={() => onChange('official')}
        style={{
          flex: 1,
          border: 'none',
          padding: '10px 16px',
          borderRadius: '26px',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          background: activeRole === 'official' ? '#e60023' : 'transparent',
          color: activeRole === 'official' ? '#ffffff' : '#000000',
          transition: 'all 150ms ease-in-out',
        }}
      >
        Official
      </button>
    </div>
  )
}
