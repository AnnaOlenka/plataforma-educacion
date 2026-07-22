import { Navigate, Outlet } from 'react-router-dom'
import useAuthContext from '../hooks/useAuthContext'
import { getHomeRouteForRole } from './routes'

export default function GuestRoute({ children }) {
  const { token, user } = useAuthContext()

  // Si el usuario ya está autenticado, redirigir a su panel según su rol
  if (token && user) {
    const homeRoute = getHomeRouteForRole(user.rol)
    return <Navigate to={homeRoute} replace />
  }

  return children ? children : <Outlet />
}
