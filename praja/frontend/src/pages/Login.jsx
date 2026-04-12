import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import prajaLogo   from '../assets/RR.jpg';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Login.css';

const DEMO_USERS = [
  { role: 'Citizen',            level: 'Public',   aadhaar: '2345 6789 0123', password: 'Demo', name: 'Ramesh Kumar',    color: '#ff7a2f', levelBg: 'rgba(255,107,0,0.12)' },
  { role: 'Sarpanch',           level: 'Local',    aadhaar: '1111 2222 3333', password: 'Demo', name: 'Lakshmi Devi',    color: '#22c55e', levelBg: 'rgba(34,197,94,0.12)' },
  { role: 'District Collector', level: 'District', aadhaar: '7890 1234 5678', password: 'Demo', name: 'Vikram Singh',    color: '#38bdf8', levelBg: 'rgba(56,189,248,0.12)' },
  { role: 'MLA',                level: 'State',    aadhaar: '9012 3456 7890', password: 'Demo', name: 'Arjun Mehta',     color: '#a78bfa', levelBg: 'rgba(167,139,250,0.12)' },
  { role: 'MP',                 level: 'Union',    aadhaar: '4444 5555 6666', password: 'Demo', name: 'Rajendra Prasad', color: '#fbbf24', levelBg: 'rgba(251,191,36,0.12)' },
];

const HERO_STATS = [
  { num: '12,470+', label: 'Grievances Filed' },
  { num: '89%',     label: 'Resolution Rate' },
  { num: '5',       label: 'Districts Active' },
];

const formatAadhaar = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(' ')
  );
};


export default function Login() {
  const forceLoginAndRedirect = (role, name) => {
    const user = {
      id: 'demo-' + Date.now(),
      name: name,
      full_name: name,
      role: role.toLowerCase().replace(' ', '_'),
      aadhaar_number: '123412341234'
    };
    
    
    localStorage.setItem('praja_user', JSON.stringify(user));
    
    // Hard redirect
    window.location.href = '/dashboard';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#ff7a2f' }}>PRAJA Demo Login</h1>
      <p style={{ marginBottom: '40px', color: '#94a3b8' }}>Select a role to enter the platform</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px' }}>
        {DEMO_USERS.map((u) => (
          <button 
            key={u.role}
            onClick={() => forceLoginAndRedirect(u.role, u.name)}
            style={{
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid ' + u.color,
              background: '#1e293b',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              display: 'flex',
              justifyContent: 'space-between'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>{u.role}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', alignSelf: 'center' }}>({u.name})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
