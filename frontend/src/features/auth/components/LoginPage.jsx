import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import useAuthStore from '../../../store/authStore'
import styles from './LoginPage.module.css'

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setApiError('')
    try {
      const { data } = await login(email, password)
      setAuth(data.user, data.access, data.refresh)
      const role = data.user?.rol
      if (role === 'admin') navigate('/admin')
      else if (role === 'instructor') navigate('/instructor')
      else navigate('/cursos')
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.logo}>EduPath</span>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Iniciar sesión</h1>
          <p className={styles.subtitle}>Crece profesionalmente con nosotros</p>

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

            <div className={styles.field}>
              <label className={styles.label}>Contraseña</label>
              <div className={styles.inputWrap}>
                <span className={styles.icon}><IconLock /></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  {...register('password', { required: 'La contraseña es requerida' })}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Mostrar contraseña"
                >
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {errors.password && <span className={styles.errorMsg}>{errors.password.message}</span>}
            </div>

            {apiError && <p className={styles.apiError}>{apiError}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

        </div>

        <div className={styles.wave} aria-hidden="true" />
      </main>
    </div>
  )
}
