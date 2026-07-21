import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getMe, updateMe, changePassword } from '../../auth/services/authService'
import useAuthStore from '../../../store/authStore'
import styles from './UserProfile.module.css'

export default function UserProfile() {
  const { user, setAuth, token } = useAuthStore()
  const [tab, setTab] = useState('perfil')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const profileForm = useForm()
  const passForm = useForm()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState('')

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await getMe()
        profileForm.reset({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          username: data.username || '',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onSaveProfile = async (values) => {
    setSavingProfile(true)
    try {
      const { data } = await updateMe({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
      })
      const refresh = localStorage.getItem('refresh_token') || ''
      setAuth(data, token, refresh)
      notify('Perfil actualizado correctamente')
    } catch (err) {
      const d = err.response?.data
      notify(typeof d === 'string' ? d : Object.values(d || {}).flat().join(' ') || 'Error al guardar', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePass = async (values) => {
    setPassError('')
    setSavingPass(true)
    try {
      await changePassword(values.old_password, values.new_password, values.new_password_confirm)
      passForm.reset()
      notify('Contraseña actualizada correctamente')
    } catch (err) {
      const d = err.response?.data
      setPassError(typeof d === 'string' ? d : Object.values(d || {}).flat().join(' ') || 'Error al cambiar contraseña')
    } finally {
      setSavingPass(false)
    }
  }

  const newPass = passForm.watch('new_password')

  const rolLabel = { estudiante: 'Estudiante', instructor: 'Instructor', admin: 'Administrador' }

  function IconUser() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  }
  function IconLock() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mi perfil</h1>
        <p className={styles.pageDesc}>Gestiona tu información personal y seguridad</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar izquierda */}
        <div className={styles.sidebar}>
          <div className={styles.heroCard}>
            <div className={styles.heroAvatar}>
              {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
            </div>
            <div className={styles.heroName}>{user?.first_name} {user?.last_name}</div>
            <div className={styles.heroMeta}>
              @{user?.username} · <span className={styles.rolBadge}>{rolLabel[user?.rol] || user?.rol}</span>
            </div>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'perfil' ? styles.tabActive : ''}`} onClick={() => setTab('perfil')}>
              <IconUser /> Datos personales
            </button>
            <button className={`${styles.tab} ${tab === 'seguridad' ? styles.tabActive : ''}`} onClick={() => setTab('seguridad')}>
              <IconLock /> Seguridad
            </button>
          </div>
        </div>

        {/* Contenido derecha */}
        {loading ? (
          <div className={styles.stateWrap}><div className={styles.spinner} /></div>
        ) : tab === 'perfil' ? (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Datos personales</h2>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input className={styles.input} placeholder="Ana"
                  {...profileForm.register('first_name', { required: 'Requerido' })} />
                {profileForm.formState.errors.first_name && <span className={styles.errorMsg}>{profileForm.formState.errors.first_name.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellido</label>
                <input className={styles.input} placeholder="Pérez"
                  {...profileForm.register('last_name', { required: 'Requerido' })} />
                {profileForm.formState.errors.last_name && <span className={styles.errorMsg}>{profileForm.formState.errors.last_name.message}</span>}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nombre de usuario</label>
              <input className={`${styles.input} ${styles.inputDisabled}`} disabled
                {...profileForm.register('username')} />
              <span className={styles.hint}>El nombre de usuario no se puede cambiar.</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Correo electrónico</label>
              <input className={styles.input} type="email" placeholder="ana@ejemplo.com"
                {...profileForm.register('email', {
                  required: 'Requerido',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                })} />
              {profileForm.formState.errors.email && <span className={styles.errorMsg}>{profileForm.formState.errors.email.message}</span>}
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.btnPrimary} disabled={savingProfile}>
                {savingProfile ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
        ) : (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Cambiar contraseña</h2>
          <form onSubmit={passForm.handleSubmit(onChangePass)} noValidate>
            {passError && <div className={styles.apiError}>{passError}</div>}
            <div className={styles.field}>
              <label className={styles.label}>Contraseña actual</label>
              <input type="password" className={styles.input} placeholder="Tu contraseña actual"
                {...passForm.register('old_password', { required: 'Requerido' })} />
              {passForm.formState.errors.old_password && <span className={styles.errorMsg}>{passForm.formState.errors.old_password.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nueva contraseña</label>
              <input type="password" className={styles.input} placeholder="Mínimo 8 caracteres"
                {...passForm.register('new_password', {
                  required: 'Requerido',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' }
                })} />
              {passForm.formState.errors.new_password && <span className={styles.errorMsg}>{passForm.formState.errors.new_password.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirmar nueva contraseña</label>
              <input type="password" className={styles.input} placeholder="Repite la nueva contraseña"
                {...passForm.register('new_password_confirm', {
                  required: 'Requerido',
                  validate: (v) => v === newPass || 'Las contraseñas no coinciden'
                })} />
              {passForm.formState.errors.new_password_confirm && <span className={styles.errorMsg}>{passForm.formState.errors.new_password_confirm.message}</span>}
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.btnPrimary} disabled={savingPass}>
                {savingPass ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastErr : styles.toastOk}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
