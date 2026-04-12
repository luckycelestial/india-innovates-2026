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
  const { login } = useAuth();
  const navigate = useNavigate();

  const forceLoginAndRedirect = async (role, name, aadhaar) => {
    try {
      await login(aadhaar, 'Demo');
      navigate('/dashboard');
    } catch (err) {
      console.error('Quick login failed:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={prajaLogo} alt="PRAJA Logo" className="login-logo" />
          <h1>PRAJA Demo Login</h1>
          <p>India's Unified Public Grievance Intelligence</p>
        </div>
        
        <div className="role-grid">
          {DEMO_USERS.map((u) => (
            <button 
              key={u.role}
              onClick={() => forceLoginAndRedirect(u.role, u.name, u.aadhaar)}
              className="role-btn"
              style={{ '--accent': u.color, '--bg': u.levelBg }}
            >
              <div className="role-btn-top">
                <span className="role-label">{u.role}</span>
                <span className="role-level">{u.level}</span>
              </div>
              <div className="role-name">{u.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
