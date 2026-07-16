import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '../services/authService'
import styles from './AuthPages.module.css'

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const IconCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid   = searchParams.get('uid')
  const token = searchParams.get('token')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone]               = useState(false)
  const [apiError, setApiError]       = useState('')

  const onSubmit = async ({ new_password, new_password_confirm }) => {
    setApiError('')
    try {
      await resetPassword(uid, token, new_password, new_password_confirm)
      setDone(true)
    } catch (err) {
      const data = err.response?.data
      setApiError(
        typeof data === 'string'
          ? data
          : Object.values(data || {}).flat().join(' ') || 'El enlace es inválido o ya expiró.'
      )
    }
  }

  if (!uid || !token) {
    return (
      <div className={styles.page}>
        <header className={styles.topbar}><span className={styles.logo}>EduPath</span></header>
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.successState}>
              <p className={styles.apiError}>Enlace inválido. Solicita uno nuevo.</p>
              <Link to="/forgot-password" className={styles.backLink}>Solicitar nuevo enlace</Link>
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </main>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>EduPath</span>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          {done ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}><IconCheck /></div>
              <h1 className={styles.title}>Contraseña restablecida</h1>
              <p className={styles.subtitle}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button className={styles.submitBtn} onClick={() => navigate('/login')}>
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h1 className={styles.title}>Nueva contraseña</h1>
              <p className={styles.subtitle}>Ingresa y confirma tu nueva contraseña.</p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className={styles.field}>
                  <label className={styles.label}>Nueva contraseña</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.icon}><IconLock /></span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className={`${styles.input} ${errors.new_password ? styles.inputError : ''}`}
                      {...register('new_password', {
                        required: 'Requerido',
                        minLength: { value: 8, message: 'Mínimo 8 caracteres' }
                      })}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.new_password && <span className={styles.errorMsg}>{errors.new_password.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Confirmar contraseña</label>
                  <div className={styles.inputWrap}>
                    <span className={styles.icon}><IconLock /></span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      className={`${styles.input} ${errors.new_password_confirm ? styles.inputError : ''}`}
                      {...register('new_password_confirm', {
                        required: 'Requerido',
                        validate: (v) => v === watch('new_password') || 'Las contraseñas no coinciden'
                      })}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.new_password_confirm && <span className={styles.errorMsg}>{errors.new_password_confirm.message}</span>}
                </div>

                {apiError && <p className={styles.apiError}>{apiError}</p>}

                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
        <div className={styles.wave} aria-hidden="true" />
      </main>
    </div>
  )
}
