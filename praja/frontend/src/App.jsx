import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Login            from './pages/Login'
import CitizenDashboard from './pages/citizen/CitizenDashboard'
import OfficerDashboard from './pages/officer/OfficerDashboard'
import LeaderDashboard  from './pages/leader/LeaderDashboard'

function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const routes = { citizen: '/citizen', officer: '/officer', leader: '/leader' }
  return <Navigate to={routes[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<RoleRedirect />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/citizen/*" element={
          <ProtectedRoute allowedRole="citizen"><CitizenDashboard /></ProtectedRoute>
        } />
        <Route path="/officer/*" element={
          <ProtectedRoute allowedRole="officer"><OfficerDashboard /></ProtectedRoute>
        } />
        <Route path="/leader/*" element={
          <ProtectedRoute allowedRole="leader"><LeaderDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
