import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/authService'
import styles from './AuthPages.module.css'

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const IconCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [sent, setSent] = useState(false)
  const [apiError, setApiError] = useState('')

  const onSubmit = async ({ email }) => {
    setApiError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setApiError('Ocurrió un error. Intenta de nuevo.')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>EduPath</span>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          {sent ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}><IconCheck /></div>
              <h1 className={styles.title}>Revisa tu correo</h1>
              <p className={styles.subtitle}>
                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link to="/login" className={styles.backLink}>
                <IconArrowLeft /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className={styles.title}>Recuperar cuenta</h1>
              <p className={styles.subtitle}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className={styles.field}>
                  <label className={styles.label}>Correo electrónico</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.icon}><IconMail /></span>
                    <input
                      type="email"
                      placeholder="tucorreo@ejemplo.com"
                      className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                      {...register('email', {
                        required: 'El correo es requerido',
                        pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                      })}
                    />
                  </div>
                  {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
                </div>

                {apiError && <p className={styles.apiError}>{apiError}</p>}

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <Link to="/login" className={styles.backLink}>
                <IconArrowLeft /> Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
        <div className={styles.wave} aria-hidden="true" />
      </main>
    </div>
  )
}
