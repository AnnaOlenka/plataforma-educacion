import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getUsuarios, createUsuario, deleteUsuario, updateUsuario } from '../services/usuariosService'
import styles from './GestionUsuarios.module.css'

const AVATAR_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#14b8a6','#ef4444','#8b5cf6']
function avatarColor(str) {
  const c = (str || 'U').charCodeAt(0)
  return AVATAR_COLORS[c % AVATAR_COLORS.length]
}

const ROL_BADGE = {
  admin:      { label: 'Admin',      cls: styles.badgeAdmin },
  instructor: { label: 'Instructor', cls: styles.badgeInstructor },
  estudiante: { label: 'Estudiante', cls: styles.badgeEstudiante },
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [rolFilter, setRolFilter]   = useState('')
  const [selected, setSelected]     = useState(new Set())
  const [showModal, setShowModal]   = useState(false)
  const [editUser, setEditUser]     = useState(null)
  const [apiError, setApiError]     = useState('')
  const [deleting, setDeleting]     = useState(null)
  const [rolOpen, setRolOpen]       = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const filterRef                   = useRef(null)
  const searchRef                   = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setRolOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const createForm = useForm()
  const editForm   = useForm()

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const { data } = await getUsuarios({ search, rol: rolFilter })
      setUsuarios(Array.isArray(data) ? data : data.results ?? [])
      setSelected(new Set())
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchUsuarios() }, [search, rolFilter])

  const toggleAll = (e) => {
    if (e.target.checked) setSelected(new Set(usuarios.map((u) => u.id)))
    else setSelected(new Set())
  }
  const toggleOne = (id) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const onCrear = async (values) => {
    setApiError('')
    try {
      await createUsuario({ ...values, is_active: values.is_active === 'true' || values.is_active === true })
      createForm.reset(); setShowModal(false); fetchUsuarios()
    } catch (err) {
      const data = err.response?.data
      setApiError(typeof data === 'string' ? data : Object.values(data || {}).flat().join(' '))
    }
  }

  const openEdit = (u) => {
    setEditUser(u)
    editForm.reset({ first_name: u.first_name, last_name: u.last_name, email: u.email, username: u.username, is_active: String(u.is_active) })
    setApiError('')
  }

  const onEditar = async (values) => {
    setApiError('')
    try {
      await updateUsuario(editUser.id, { ...values, is_active: values.is_active === 'true' || values.is_active === true })
      setEditUser(null); fetchUsuarios()
    } catch (err) {
      const data = err.response?.data
      setApiError(typeof data === 'string' ? data : Object.values(data || {}).flat().join(' '))
    }
  }

  const onEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    setDeleting(id)
    try {
      await deleteUsuario(id)
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
    } finally { setDeleting(null) }
  }

  const allChecked = usuarios.length > 0 && selected.size === usuarios.length

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbRoot}>EduPath</span>
        <IconBreadcrumbSlash />
        <span className={styles.breadcrumbCurrent}>Gestión de usuarios</span>
      </div>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Gestión de usuarios</h1>
            <span className={styles.countBadge}>{usuarios.length}</span>
          </div>
          <p className={styles.pageDesc}>Administra los roles y accesos de la plataforma</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft} />
        <div className={styles.toolbarRight}>
          {searchOpen ? (
            <div className={styles.searchBox} ref={searchRef}>
              <IconSearch />
              <input
                className={styles.searchInput}
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onBlur={() => { if (!search) setSearchOpen(false) }}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => { setSearch(''); setSearchOpen(false) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          ) : (
            <button className={styles.searchBtn} onClick={() => setSearchOpen(true)}>
              <IconSearch /> Buscar
            </button>
          )}
          <div className={styles.filterWrap} onClick={() => setRolOpen(p => !p)} ref={filterRef}>
            <IconRole />
            <span className={styles.filterLabel}>{rolFilter ? ROL_BADGE[rolFilter]?.label : 'Rol'}</span>
            <IconChevron />
            {rolOpen && (
              <div className={styles.filterDropdown}>
                {[
                  { v: '',           l: 'Todos',      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                  { v: 'estudiante', l: 'Estudiante',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
                  { v: 'instructor', l: 'Instructor',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
                  { v: 'admin',      l: 'Admin',       icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                ].map(({ v, l, icon }) => (
                  <div key={v} className={`${styles.filterOption} ${rolFilter === v ? styles.filterOptionActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setRolFilter(v); setRolOpen(false) }}>
                    <span className={styles.filterOptionIcon}>{icon}</span>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className={styles.btnAdd} onClick={() => { setShowModal(true); setApiError(''); createForm.reset() }}>
            <IconUserPlus /> Nuevo usuario
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th><span className={styles.thLabel}><IconUser /> Usuario <IconChevron /></span></th>
              <th><span className={styles.thLabel}><IconRole /> Rol <IconChevron /></span></th>
              <th><span className={styles.thLabel}><IconClock /> Estado <IconChevron /></span></th>
              <th><span className={styles.thLabel}><IconCalendar /> Registro <IconChevron /></span></th>
              <th><span className={styles.thLabel}>Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className={styles.empty}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={5} className={styles.empty}>No se encontraron usuarios</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.miniAvatar} style={{ background: avatarColor(u.first_name?.[0] || u.username?.[0]), color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                        {(u.first_name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                        </div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${ROL_BADGE[u.rol]?.cls}`}>
                      {ROL_BADGE[u.rol]?.label || u.rol}
                    </span>
                  </td>
                  <td>
                    {u.is_active
                      ? <span className={styles.statusActive}><span className={styles.dot} /> Activo</span>
                      : <span className={styles.statusInactive}><span className={styles.dot} /> Inactivo</span>}
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(u.fecha_registro).toLocaleDateString('es-PE')}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(u)} title="Editar">
                        <IconEdit />
                      </button>
                      <button className={styles.btnDelete} onClick={() => onEliminar(u.id)} disabled={deleting === u.id} title="Eliminar">
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nuevo Usuario</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}><IconX /></button>
            </div>
            <form onSubmit={createForm.handleSubmit(onCrear)} noValidate>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input placeholder="Nombre" {...createForm.register('first_name', { required: 'Requerido' })} />
                  {createForm.formState.errors.first_name && <span>{createForm.formState.errors.first_name.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Apellido</label>
                  <input placeholder="Apellido" {...createForm.register('last_name', { required: 'Requerido' })} />
                  {createForm.formState.errors.last_name && <span>{createForm.formState.errors.last_name.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Nombre de usuario</label>
                  <input placeholder="username" {...createForm.register('username', { required: 'Requerido' })} />
                  {createForm.formState.errors.username && <span>{createForm.formState.errors.username.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Correo electrónico</label>
                  <input type="email" placeholder="correo@ejemplo.com" {...createForm.register('email', {
                    required: 'Requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                  })} />
                  {createForm.formState.errors.email && <span>{createForm.formState.errors.email.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Contraseña</label>
                  <input type="password" placeholder="••••••••" {...createForm.register('password', { required: 'Requerido', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
                  {createForm.formState.errors.password && <span>{createForm.formState.errors.password.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Confirmar contraseña</label>
                  <input type="password" placeholder="••••••••" {...createForm.register('password_confirm', { required: 'Requerido' })} />
                  {createForm.formState.errors.password_confirm && <span>{createForm.formState.errors.password_confirm.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Rol</label>
                  <select {...createForm.register('rol', { required: 'Requerido' })}>
                    <option value="">Seleccionar rol</option>
                    <option value="estudiante">Estudiante</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                  {createForm.formState.errors.rol && <span>{createForm.formState.errors.rol.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Estado</label>
                  <select {...createForm.register('is_active')} defaultValue="true">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>

              </div>
              {apiError && <p className={styles.apiError}>{apiError}</p>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editUser && (
        <div className={styles.overlay} onClick={() => setEditUser(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar Usuario</h2>
              <button className={styles.closeBtn} onClick={() => setEditUser(null)}><IconX /></button>
            </div>
            <form onSubmit={editForm.handleSubmit(onEditar)} noValidate>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input placeholder="Nombre" {...editForm.register('first_name', { required: 'Requerido' })} />
                  {editForm.formState.errors.first_name && <span>{editForm.formState.errors.first_name.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Apellido</label>
                  <input placeholder="Apellido" {...editForm.register('last_name', { required: 'Requerido' })} />
                  {editForm.formState.errors.last_name && <span>{editForm.formState.errors.last_name.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Nombre de usuario</label>
                  <input placeholder="username" {...editForm.register('username', { required: 'Requerido' })} />
                  {editForm.formState.errors.username && <span>{editForm.formState.errors.username.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Correo electrónico</label>
                  <input type="email" placeholder="correo@ejemplo.com" {...editForm.register('email', {
                    required: 'Requerido',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' }
                  })} />
                  {editForm.formState.errors.email && <span>{editForm.formState.errors.email.message}</span>}
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Estado</label>
                  <select {...editForm.register('is_active')}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              {apiError && <p className={styles.apiError}>{apiError}</p>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setEditUser(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function IconBreadcrumbSlash() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="16" y1="4" x2="8" y2="20"/></svg> }
function IconPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconUserPlus() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> }
function IconSearch()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IconTrash()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg> }
function IconEdit()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconX()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconChevron() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg> }
function IconUser()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconRole()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><circle cx="18" cy="8" r="2"/><path d="M21 14c1.5.5 3 1.8 3 4"/></svg> }
function IconClock()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IconCalendar(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconUserFill() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <circle cx="20" cy="20" r="20" fill="#c8c8c8"/>
      <circle cx="20" cy="18" r="6" fill="#efefef"/>
      <path d="M7 42c0-8 5.8-12 13-12s13 4 13 12" fill="#efefef"/>
    </svg>
  )
}
