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
import InstructorDashboard from '../features/instructor/components/InstructorDashboard'
import InstructorCursos from '../features/instructor/components/InstructorCursos'
import CursoEditor from '../features/instructor/components/CursoEditor'
import InstructorCalificaciones from '../features/instructor/components/InstructorCalificaciones'
import InstructorAnalitica from '../features/instructor/components/InstructorAnalitica'
import AdminDashboard from '../features/admin/components/AdminDashboard'
import AdminCursos from '../features/admin/components/AdminCursos'
import AdminAuditoria from '../features/admin/components/AdminAuditoria'
import AdminAnaliticas from '../features/admin/components/AdminAnaliticas'
import UserProfile from '../features/perfil/components/UserProfile'
import MiProgreso from '../features/progreso/components/MiProgreso'
import MisCertificados from '../features/certificados/components/MisCertificados'
import VerificarCertificado from '../features/certificados/components/VerificarCertificado'
import RegisterPage from '../features/auth/components/RegisterPage'
import useAuthContext from '../hooks/useAuthContext'

function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthContext()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.rol)) return <Navigate to="/login" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/recuperar-cuenta" element={<ResetPasswordPage />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="usuarios" element={<GestionUsuarios />} />
          <Route path="cursos" element={<AdminCursos />} />
          <Route path="auditoria" element={<AdminAuditoria />} />
          <Route path="analiticas" element={<AdminAnaliticas />} />
        </Route>

        {/* Perfil (todos los roles autenticados) */}
        <Route path="/perfil" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<UserProfile />} />
        </Route>

        {/* Instructor */}
        <Route path="/instructor" element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="cursos" element={<InstructorCursos />} />
          <Route path="cursos/:slug/editar" element={<CursoEditor />} />
          <Route path="cursos/:slug/analitica" element={<InstructorAnalitica />} />
          <Route path="calificaciones" element={<InstructorCalificaciones />} />
          <Route path="analiticas" element={<InstructorAnalitica />} />
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

        {/* Progreso */}
        <Route path="/progreso" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MiProgreso />} />
        </Route>

        {/* Certificados autenticados */}
        <Route path="/certificados" element={
          <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MisCertificados />} />
          <Route path="verificar/:codigo" element={<VerificarCertificado />} />
        </Route>

        {/* Verificación pública (sin auth) */}
        <Route path="/verificar/:codigo" element={<VerificarCertificado />} />
        <Route path="/verificar" element={<VerificarCertificado />} />

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
