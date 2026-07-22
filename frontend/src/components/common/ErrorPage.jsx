import { useState } from 'react'
import styles from './ErrorPage.module.css'

export default function ErrorPage({ error, resetErrorBoundary }) {
  const [showDetails, setShowDetails] = useState(false)

  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentCard}>
        <div className={styles.iconCircle}>
          <IconAlertTriangle />
        </div>

        <div className={styles.errorCode}>500</div>

        <h1 className={styles.title}>Algo salió mal</h1>

        <p className={styles.description}>
          Ocurrió un problema inesperado. Por favor intenta recargar la página.
        </p>

        {error?.message && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={styles.detailsToggle}
            >
              {showDetails ? 'Ocultar detalles técnicos' : 'Ver detalle del error'}
            </button>
            {showDetails && (
              <div className={styles.errorDetails}>
                {error.toString()}
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={handleReload} className={styles.btnPrimary}>
            <IconRefresh /> Recargar página
          </button>
          
          <button onClick={handleGoHome} className={styles.btnSecondary}>
            <IconHome /> Ir al inicio
          </button>
        </div>
      </div>
    </div>
  )
}

function IconAlertTriangle() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
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
