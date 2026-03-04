import { useNavigate } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import './RoleSelection.css'

const ROLES = [
  { id: 'citizen',  label: 'Citizen',   icon: '👤', desc: 'Report grievances & track status' },
  { id: 'sarpanch', label: 'Sarpanch',  icon: '🏘️', desc: 'Manage local ward data' },
  { id: 'collector', label: 'Collector', icon: '🏛️', desc: 'District-level administration' },
  { id: 'mla',       label: 'MLA',       icon: '🇮🇳', desc: 'Constituency insights' },
  { id: 'mp',        label: 'MP',        icon: '🎗️', desc: 'Parliamentary oversight' },
]

export default function RoleSelection() {
  const { selectRole } = useRole()
  const navigate = useNavigate()

  const handleRoleSelect = (id) => {
    if (selectRole(id)) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="rs-container demo-mode">
      <div className="rs-box">
        <header className="rs-header">
          <div className="logo-section">
            <span className="logo-icon">🇮🇳</span>
            <h1 className="logo-text">PRAJA</h1>
          </div>
          <p className="rs-tagline">AI-Powered Citizen Intelligence Platform</p>
          <div className="demo-badge">PROTOTYPE DEMO</div>
        </header>

        <div className="rs-content">
            <p className="rs-subtitle">Choose a role to explore the interactive dashboard</p>
            
            <div className="role-grid">
              {ROLES.map((role) => (
                <button 
                  key={role.id} 
                  className="role-card"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <div className="role-icon-bg">{role.icon}</div>
                  <div className="role-info">
                    <span className="role-label">{role.label}</span>
                    <span className="role-desc">{role.desc}</span>
                  </div>
                  <div className="card-arrow">→</div>
                </button>
              ))}
            </div>
        </div>

        <footer className="rs-footer">
          <p>© 2026 India Innovates — India's Digital Backbone</p>
        </footer>
      </div>
    </div>
  )
}
