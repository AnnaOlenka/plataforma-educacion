import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import GuestRoute from './GuestRoute'
import { ROUTES, getHomeRouteForRole } from './routes'
import useAuthContext from '../hooks/useAuthContext'
import PageLoader from '../components/common/PageLoader'
import ErrorBoundary from '../components/common/ErrorBoundary'
import NotFoundPage from '../components/common/NotFoundPage'
import ForbiddenPage from '../components/common/ForbiddenPage'

// Layout principal (importación síncrona para evitar parpadeos de contenedor principal)
import MainLayout from '../components/layout/MainLayout'

// Páginas públicas / Auth (Carga diferida con React.lazy)
const LoginPage = lazy(() => import('../features/auth/components/LoginPage'))
const RegisterPage = lazy(() => import('../features/auth/components/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../features/auth/components/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../features/auth/components/ResetPasswordPage'))

// Páginas de Admin
const AdminDashboard = lazy(() => import('../features/admin/components/AdminDashboard'))
const GestionUsuarios = lazy(() => import('../features/admin/components/GestionUsuarios'))
const AdminCursos = lazy(() => import('../features/admin/components/AdminCursos'))
const AdminAuditoria = lazy(() => import('../features/admin/components/AdminAuditoria'))
const AdminAnaliticas = lazy(() => import('../features/admin/components/AdminAnaliticas'))

// Páginas de Instructor
const InstructorDashboard = lazy(() => import('../features/instructor/components/InstructorDashboard'))
const InstructorCursos = lazy(() => import('../features/instructor/components/InstructorCursos'))
const CursoEditor = lazy(() => import('../features/instructor/components/CursoEditor'))
const InstructorCalificaciones = lazy(() => import('../features/instructor/components/InstructorCalificaciones'))
const InstructorAnalitica = lazy(() => import('../features/instructor/components/InstructorAnalitica'))

// Páginas de Cursos / Estudiante
const MisCursos = lazy(() => import('../features/cursos/components/MisCursos'))
const CatalogoCursos = lazy(() => import('../features/cursos/components/CatalogoCursos'))
const CursoDetalle = lazy(() => import('../features/cursos/components/CursoDetalle'))
const CursoAprendizaje = lazy(() => import('../features/cursos/components/CursoAprendizaje'))

// Evaluaciones, Progreso, Certificados y Perfil
const EvaluacionesIndex = lazy(() => import('../features/evaluaciones/components/EvaluacionesIndex'))
const EvaluacionRunner = lazy(() => import('../features/evaluaciones/components/EvaluacionRunner'))
const UserProfile = lazy(() => import('../features/perfil/components/UserProfile'))
const MiProgreso = lazy(() => import('../features/progreso/components/MiProgreso'))
const MisCertificados = lazy(() => import('../features/certificados/components/MisCertificados'))
const VerificarCertificado = lazy(() => import('../features/certificados/components/VerificarCertificado'))

function RootRedirect() {
  const { token, user } = useAuthContext()
  if (!token || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }
  return <Navigate to={getHomeRouteForRole(user.rol)} replace />
}

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Redirección dinámica en la raíz '/' */}
            <Route path="/" element={<RootRedirect />} />

            {/* Rutas Públicas de Autenticación (Bloqueadas si ya está autenticado) */}
            <Route path={ROUTES.LOGIN} element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path={ROUTES.REGISTER} element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path={ROUTES.RESET_PASSWORD} element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

            {/* Verificación pública de certificados (sin requerir auth) */}
            <Route path={ROUTES.VERIFICAR_PUBLIC} element={<VerificarCertificado />} />
            <Route path={ROUTES.VERIFICAR_CODIGO_PUBLIC} element={<VerificarCertificado />} />

            {/* Área de Administración (Sólo rol 'admin') */}
            <Route
              path={ROUTES.ADMIN.ROOT}
              element={
                <ProtectedRoute roles={['admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="usuarios" element={<GestionUsuarios />} />
              <Route path="cursos" element={<AdminCursos />} />
              <Route path="auditoria" element={<AdminAuditoria />} />
              <Route path="analiticas" element={<AdminAnaliticas />} />
            </Route>

            {/* Área de Instructor (Roles 'instructor' y 'admin') */}
            <Route
              path={ROUTES.INSTRUCTOR.ROOT}
              element={
                <ProtectedRoute roles={['instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<InstructorDashboard />} />
              <Route path="cursos" element={<InstructorCursos />} />
              <Route path="cursos/:slug/editar" element={<CursoEditor />} />
              <Route path="cursos/:slug/analitica" element={<InstructorAnalitica />} />
              <Route path="calificaciones" element={<InstructorCalificaciones />} />
              <Route path="analiticas" element={<InstructorAnalitica />} />
            </Route>

            {/* Cursos y Aprendizaje (Todos los usuarios autenticados) */}
            <Route
              path={ROUTES.CURSOS.ROOT}
              element={
                <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MisCursos />} />
              <Route path="catalogo" element={<CatalogoCursos />} />
              <Route path=":slug" element={<CursoDetalle />} />
              <Route path=":slug/aprender" element={<CursoAprendizaje />} />
            </Route>

            {/* Perfil del Usuario */}
            <Route
              path={ROUTES.PERFIL}
              element={
                <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserProfile />} />
            </Route>

            {/* Progreso del Estudiante */}
            <Route
              path={ROUTES.PROGRESO}
              element={
                <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MiProgreso />} />
            </Route>

            {/* Certificados */}
            <Route
              path={ROUTES.CERTIFICADOS}
              element={
                <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MisCertificados />} />
              <Route path="verificar/:codigo" element={<VerificarCertificado />} />
            </Route>

            {/* Evaluaciones */}
            <Route
              path={ROUTES.EVALUACIONES}
              element={
                <ProtectedRoute roles={['estudiante', 'instructor', 'admin']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EvaluacionesIndex />} />
              <Route path="leccion/:leccionId" element={<EvaluacionRunner />} />
            </Route>

            {/* Páginas de Error Explícitas */}
            <Route path={ROUTES.ERROR_403} element={<ForbiddenPage />} />
            <Route path={ROUTES.ERROR_404} element={<NotFoundPage />} />

            {/* Captura de Cualquier Ruta No Encontrada (404) */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
