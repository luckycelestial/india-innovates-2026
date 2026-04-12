import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Component } from 'react'

import Login            from './pages/Login'
import About            from './pages/About'
import UnifiedDashboard from './pages/UnifiedDashboard'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#080f1e', color: '#ef4444', minHeight: '100vh' }}>
        <h2 style={{ color: '#FF6B00', marginBottom: 16 }}>⚠️ App Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#e2e8f0', background: '#111d35', padding: 20, borderRadius: 10, fontSize: '0.8rem' }}>
          {String(this.state.error)}{'\n\n'}{this.state.error?.stack}
        </pre>
      </div>
    )
    return this.props.children
  }
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<RoleRedirect />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/about"       element={<About />} />
        <Route path="/dashboard/*" element={<ProtectedRoute><UnifiedDashboard /></ProtectedRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
