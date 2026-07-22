import { Navigate, useLocation, Outlet } from 'react-router-dom'
import useAuthContext from '../hooks/useAuthContext'
import { ROUTES } from './routes'

export default function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthContext()
  const location = useLocation()

  // 1. Si no está autenticado, redirigir a /login preservando la ruta previa
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // 2. Si está autenticado pero no tiene permisos para este rol, redirigir a /403
  if (roles && roles.length > 0 && user && !roles.includes(user.rol)) {
    return (
      <Navigate
        to={ROUTES.ERROR_403}
        state={{
          requiredRoles: roles,
          userRole: user.rol,
          attemptedPath: location.pathname,
        }}
        replace
      />
    )
  }

  return children ? children : <Outlet />
}
