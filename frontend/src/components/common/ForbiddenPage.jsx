import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../../hooks/useAuthContext'
import { getHomeRouteForRole, ROUTES } from '../../router/routes'
import styles from './ForbiddenPage.module.css'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const { token, user } = useAuthContext()

  const homePath = token && user ? getHomeRouteForRole(user.rol) : ROUTES.LOGIN

  return (
    <div className={styles.container}>
      <div className={styles.contentCard}>
        <div className={styles.iconCircle}>
          <IconLock />
        </div>

        <div className={styles.errorCode}>403</div>

        <h1 className={styles.title}>Acceso Denegado</h1>

        <p className={styles.description}>
          No tienes permisos para acceder a esta sección con tu cuenta actual.
        </p>

        {user?.rol && (
          <div className={styles.roleTag}>
            Rol actual: <span className={styles.roleHighlight}>{user.rol}</span>
          </div>
        )}

        <div className={styles.actions}>
          <Link to={homePath} className={styles.btnPrimary}>
            <IconHome /> Ir a mi panel
          </Link>

          <button onClick={() => navigate(-1)} className={styles.btnSecondary}>
            <IconArrowLeft /> Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}

function IconLock() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}
