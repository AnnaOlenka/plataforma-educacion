import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getUsuarios, createUsuario, deleteUsuario } from '../services/usuariosService'
import styles from './GestionUsuarios.module.css'

const ROL_BADGE = {
  admin:      { label: 'Admin',      cls: styles.badgeAdmin },
  instructor: { label: 'Instructor', cls: styles.badgeInstructor },
  estudiante: { label: 'Estudiante', cls: styles.badgeEstudiante },
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [rolFilter, setRolFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [apiError, setApiError]   = useState('')
  const [deleting, setDeleting]   = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const { data } = await getUsuarios({ search, rol: rolFilter })
      setUsuarios(Array.isArray(data) ? data : data.results ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsuarios() }, [search, rolFilter])

  const onCrear = async (values) => {
    setApiError('')
    try {
      await createUsuario(values)
      reset()
      setShowModal(false)
      fetchUsuarios()
    } catch (err) {
      const data = err.response?.data
      setApiError(
        typeof data === 'string'
          ? data
          : Object.values(data || {}).flat().join(' ')
      )
    }
  }

  const onEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    setDeleting(id)
    try {
      await deleteUsuario(id)
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Usuarios</h1>
          <p className={styles.subtitle}>{usuarios.length} usuarios registrados</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => { setShowModal(true); setApiError(''); reset() }}>
          <IconPlus /> Nuevo Usuario
        </button>
      </header>

      {/* Filtros */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <IconSearch />
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.select} value={rolFilter} onChange={(e) => setRolFilter(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="estudiante">Estudiante</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Registro</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.empty}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>No se encontraron usuarios</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.miniAvatar}>
                        {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                        </div>
                        <div className={styles.userUsername}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.emailCell}>{u.email}</td>
                  <td>
                    <span className={`${styles.badge} ${ROL_BADGE[u.rol]?.cls}`}>
                      {ROL_BADGE[u.rol]?.label || u.rol}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(u.fecha_registro).toLocaleDateString('es-PE')}
                  </td>
                  <td>
                    <span className={u.is_active ? styles.activeChip : styles.inactiveChip}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.btnDelete}
                      onClick={() => onEliminar(u.id)}
                      disabled={deleting === u.id}
                      title="Eliminar usuario"
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nuevo Usuario</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}><IconX /></button>
            </div>

            <form onSubmit={handleSubmit(onCrear)} noValidate>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input placeholder="Nombre" {...register('first_name', { required: 'Requerido' })} />
                  {errors.first_name && <span>{errors.first_name.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Apellido</label>
                  <input placeholder="Apellido" {...register('last_name', { required: 'Requerido' })} />
                  {errors.last_name && <span>{errors.last_name.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Nombre de usuario</label>
                  <input placeholder="username" {...register('username', { required: 'Requerido' })} />
                  {errors.username && <span>{errors.username.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Correo electrónico</label>
                  <input type="email" placeholder="correo@ejemplo.com" {...register('email', {
                    required: 'Requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                  })} />
                  {errors.email && <span>{errors.email.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Contraseña</label>
                  <input type="password" placeholder="••••••••" {...register('password', { required: 'Requerido', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
                  {errors.password && <span>{errors.password.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Confirmar contraseña</label>
                  <input type="password" placeholder="••••••••" {...register('password_confirm', { required: 'Requerido' })} />
                  {errors.password_confirm && <span>{errors.password_confirm.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Rol</label>
                  <select {...register('rol', { required: 'Requerido' })}>
                    <option value="">Seleccionar rol</option>
                    <option value="estudiante">Estudiante</option>
                    <option value="instructor">Instructor</option>
                  </select>
                  {errors.rol && <span>{errors.rol.message}</span>}
                </div>
              </div>

              {apiError && <p className={styles.apiError}>{apiError}</p>}

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function IconPlus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function IconX() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
