import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../features/auth/components/LoginPage'
import MainLayout from '../components/layout/MainLayout'
import GestionUsuarios from '../features/admin/components/GestionUsuarios'
import useAuthStore from '../store/authStore'

function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.rol)) return <Navigate to="/login" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="usuarios" replace />} />
          <Route path="usuarios" element={<GestionUsuarios />} />
          <Route path="dashboard" element={<div style={{padding:'2rem'}}>Dashboard admin</div>} />
        </Route>

        {/* Instructor */}
        <Route path="/instructor" element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<div style={{padding:'2rem'}}>Dashboard instructor</div>} />
        </Route>

        {/* Estudiante */}
        <Route path="/cursos" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<div style={{padding:'2rem'}}>Mis Cursos</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
