import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { register as registerUser, login } from '../services/authService'
import useAuthStore from '../../../store/authStore'
import styles from './LoginPage.module.css'

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

export default function RegisterPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const password = watch('password')

  const onSubmit = async (values) => {
    setLoading(true)
    setApiError('')
    try {
      await registerUser({
        username: values.username,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
        password_confirm: values.password_confirm,
        rol: values.rol,
      })
      const { data } = await login(values.email, values.password)
      setAuth(data.user, data.access, data.refresh)
      const role = data.user?.rol
      if (role === 'instructor') navigate('/instructor')
      else navigate('/cursos')
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const msgs = Object.values(data).flat().join(' ')
        setApiError(msgs || 'Error al registrarse')
      } else {
        setApiError('Error al registrarse')
      }
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
        <div className={styles.card} style={{ maxWidth: 460, marginBottom: 200 }}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Únete a EduPath y empieza a aprender</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Rol selector */}
            <div className={styles.field}>
              <label className={styles.label}>Tipo de cuenta</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['estudiante', 'instructor'].map((r) => (
                  <label key={r} style={{ flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value={r}
                      style={{ display: 'none' }}
                      {...register('rol', { required: 'Selecciona un rol' })}
                    />
                    <RolCard rol={r} selected={watch('rol') === r} />
                  </label>
                ))}
              </div>
              {errors.rol && <span className={styles.errorMsg}>{errors.rol.message}</span>}
            </div>

            {/* Nombre y apellido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <div className={styles.inputWrap}>
                  <span className={styles.icon}><IconUser /></span>
                  <input
                    type="text"
                    placeholder="Ana"
                    className={`${styles.input} ${errors.first_name ? styles.inputError : ''}`}
                    {...register('first_name', { required: 'Requerido' })}
                  />
                </div>
                {errors.first_name && <span className={styles.errorMsg}>{errors.first_name.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellido</label>
                <div className={styles.inputWrap}>
                  <span className={styles.icon}><IconUser /></span>
                  <input
                    type="text"
                    placeholder="Pérez"
                    className={`${styles.input} ${errors.last_name ? styles.inputError : ''}`}
                    {...register('last_name', { required: 'Requerido' })}
                  />
                </div>
                {errors.last_name && <span className={styles.errorMsg}>{errors.last_name.message}</span>}
              </div>
            </div>

            {/* Username */}
            <div className={styles.field}>
              <label className={styles.label}>Nombre de usuario</label>
              <div className={styles.inputWrap}>
                <span className={styles.icon}><IconUser /></span>
                <input
                  type="text"
                  placeholder="ana_perez"
                  className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                  {...register('username', {
                    required: 'El usuario es requerido',
                    minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                    pattern: { value: /^[\w.@+-]+$/, message: 'Solo letras, números y . @ + - _' }
                  })}
                />
              </div>
              {errors.username && <span className={styles.errorMsg}>{errors.username.message}</span>}
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label className={styles.label}>Correo electrónico</label>
              <div className={styles.inputWrap}>
                <span className={styles.icon}><IconMail /></span>
                <input
                  type="email"
                  placeholder="ana@ejemplo.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  {...register('email', {
                    required: 'El correo es requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                  })}
                />
              </div>
              {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label className={styles.label}>Contraseña</label>
              <div className={styles.inputWrap}>
                <span className={styles.icon}><IconLock /></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: { value: 8, message: 'Mínimo 8 caracteres' }
                  })}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {errors.password && <span className={styles.errorMsg}>{errors.password.message}</span>}
            </div>

            {/* Confirm */}
            <div className={styles.field}>
              <label className={styles.label}>Confirmar contraseña</label>
              <div className={styles.inputWrap}>
                <span className={styles.icon}><IconLock /></span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  className={`${styles.input} ${errors.password_confirm ? styles.inputError : ''}`}
                  {...register('password_confirm', {
                    required: 'Confirma tu contraseña',
                    validate: (v) => v === password || 'Las contraseñas no coinciden'
                  })}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {errors.password_confirm && <span className={styles.errorMsg}>{errors.password_confirm.message}</span>}
            </div>

            {apiError && <p className={styles.apiError}>{apiError}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className={styles.registerLink}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>

        <div className={styles.wave} aria-hidden="true" />
      </main>
    </div>
  )
}

function RolCard({ rol, selected }) {
  const labels = { estudiante: 'Estudiante', instructor: 'Instructor' }
  const icons = {
    estudiante: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>
      </svg>
    ),
    instructor: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  }
  return (
    <div style={{
      border: `2px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
      borderRadius: 12,
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      background: selected ? '#eef2ff' : '#fff',
      color: selected ? '#4f46e5' : '#6b7280',
      transition: 'all .15s',
      fontWeight: selected ? 700 : 500,
      fontSize: '0.9rem',
    }}>
      {icons[rol]}
      {labels[rol]}
    </div>
  )
}
