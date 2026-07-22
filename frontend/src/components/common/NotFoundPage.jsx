import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../../hooks/useAuthContext'
import { getHomeRouteForRole, ROUTES } from '../../router/routes'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { token, user } = useAuthContext()

  const homePath = token && user ? getHomeRouteForRole(user.rol) : ROUTES.LOGIN

  return (
    <div className={styles.container}>
      <div className={styles.contentCard}>
        <div className={styles.iconCircle}>
          <IconSearchOff />
        </div>

        <div className={styles.errorCode}>404</div>

        <h1 className={styles.title}>Página no encontrada</h1>

        <p className={styles.description}>
          No pudimos encontrar la página que buscas. Es posible que la dirección sea incorrecta o haya sido movida.
        </p>

        <div className={styles.actions}>
          <Link to={homePath} className={styles.btnPrimary}>
            <IconHome /> Ir al inicio
          </Link>
          
          <button onClick={() => navigate(-1)} className={styles.btnSecondary}>
            <IconArrowLeft /> Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}

function IconSearchOff() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
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
