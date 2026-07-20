import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../features/auth/components/LoginPage'
import ForgotPasswordPage from '../features/auth/components/ForgotPasswordPage'
import ResetPasswordPage from '../features/auth/components/ResetPasswordPage'
import MainLayout from '../components/layout/MainLayout'
import GestionUsuarios from '../features/admin/components/GestionUsuarios'
import CatalogoCursos from '../features/cursos/components/CatalogoCursos'
import MisCursos from '../features/cursos/components/MisCursos'
import CursoDetalle from '../features/cursos/components/CursoDetalle'
import CursoAprendizaje from '../features/cursos/components/CursoAprendizaje'
import EvaluacionesIndex from '../features/evaluaciones/components/EvaluacionesIndex'
import EvaluacionRunner from '../features/evaluaciones/components/EvaluacionRunner'
import useAuthStore from '../store/authStore'

function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.rol)) return <Navigate to="/login" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/recuperar-cuenta" element={<ResetPasswordPage />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="usuarios" replace />} />
          <Route path="usuarios" element={<GestionUsuarios />} />
          <Route path="cursos" element={<CatalogoCursos />} />
          <Route path="cursos/:slug" element={<CursoDetalle />} />
          <Route path="cursos/:slug/aprender" element={<CursoAprendizaje />} />
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
          <Route path="cursos" element={<CatalogoCursos />} />
          <Route path="cursos/:slug" element={<CursoDetalle />} />
          <Route path="cursos/:slug/aprender" element={<CursoAprendizaje />} />
        </Route>

        {/* Estudiante (y navegación de cursos compartida) */}
        <Route path="/cursos" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MisCursos />} />
          <Route path="catalogo" element={<CatalogoCursos />} />
          <Route path=":slug" element={<CursoDetalle />} />
          <Route path=":slug/aprender" element={<CursoAprendizaje />} />
        </Route>

        {/* Evaluaciones (estudiante, instructor, admin) */}
        <Route path="/evaluaciones" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<EvaluacionesIndex />} />
          <Route path="leccion/:leccionId" element={<EvaluacionRunner />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
