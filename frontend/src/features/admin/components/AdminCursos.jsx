import { useEffect, useRef, useState } from 'react'
import { getAdminCursos, aprobarCurso, rechazarCurso, archivarCurso, unwrap } from '../services/adminService'
import styles from './Admin.module.css'

const ESTADO_INFO = {
  pendiente_aprobacion: { label: 'Pendiente', cls: styles.badgePending },
  publicado: { label: 'Publicado', cls: styles.badgePublished },
  rechazado: { label: 'Rechazado', cls: styles.badgeRejected },
  borrador: { label: 'Borrador', cls: styles.badgeDraft },
  archivado: { label: 'Archivado', cls: styles.badgeArchived },
}

export default function AdminCursos() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [search, setSearch] = useState('')
  const [rechazando, setRechazando] = useState(null)
  const [busy, setBusy] = useState({})
  const toastRef = useRef(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page_size: 50 }
      if (filtroEstado) params.estado = filtroEstado
      if (search) params.search = search
      const { data } = await getAdminCursos(params)
      setCursos(unwrap(data))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtroEstado, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg, type = 'ok') => {
    const el = toastRef.current
    if (!el) return
    el.textContent = msg
    el.className = `${styles.toast} ${type === 'ok' ? styles.toastOk : styles.toastErr}`
    el.style.display = 'block'
    clearTimeout(el._t)
    el._t = setTimeout(() => { if (el) el.style.display = 'none' }, 3500)
  }

  const doAccion = async (accion, slug, extra = null) => {
    setBusy(prev => ({ ...prev, [slug + accion]: true }))
    try {
      let res
      if (accion === 'aprobar') res = await aprobarCurso(slug)
      else if (accion === 'rechazar') res = await rechazarCurso(slug, extra)
      else if (accion === 'archivar') res = await archivarCurso(slug)
      setCursos(prev => prev.map(c => c.slug === slug ? res.data : c))
      showToast(accion === 'aprobar' ? 'Curso aprobado' : accion === 'rechazar' ? 'Curso rechazado' : 'Curso archivado')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al procesar', 'err')
    } finally {
      setBusy(prev => ({ ...prev, [slug + accion]: false }))
    }
  }

  const pendientes = cursos.filter(c => c.estado === 'pendiente_aprobacion').length

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Cursos</h1>
            {pendientes > 0 && <span className={styles.countBadge}>{pendientes} pendientes</span>}
          </div>
          <p className={styles.pageDesc}>Aprueba, rechaza o archiva cursos de la plataforma</p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2 className={styles.tableTitle}>Lista de cursos</h2>
          <div className={styles.tableControls}>
            <input
              className={styles.searchInput}
              placeholder="Buscar por título o instructor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.select} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="pendiente_aprobacion">Pendiente</option>
              <option value="publicado">Publicado</option>
              <option value="rechazado">Rechazado</option>
              <option value="borrador">Borrador</option>
              <option value="archivado">Archivado</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.stateWrap}><div className={styles.spinner} /></div>
        ) : cursos.length === 0 ? (
          <div className={styles.stateWrap}>
            <div className={styles.stateIcon}><IconBook /></div>
            <p className={styles.stateTitle}>Sin cursos</p>
            <p className={styles.stateDesc}>No hay cursos que coincidan con los filtros.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Instructor</th>
                  <th>Estado</th>
                  <th>Solicitado</th>
                  <th>Revisado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((c) => {
                  const ei = ESTADO_INFO[c.estado] || ESTADO_INFO.borrador
                  return (
                    <tr key={c.slug}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>{c.titulo}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{c.slug}</div>
                        {c.estado === 'rechazado' && c.motivo_rechazo && (
                          <div className={styles.motivoBox}>{c.motivo_rechazo}</div>
                        )}
                      </td>
                      <td>
                        <div className={styles.tdUser}>
                          <span className={styles.avatar}>{(c.instructor_nombre?.[0] || 'I').toUpperCase()}</span>
                          <div>
                            <div className={styles.userName}>{c.instructor_nombre || c.instructor_username}</div>
                            <div className={styles.userMeta}>{c.nivel}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`${styles.badge} ${ei.cls}`}>{ei.label}</span></td>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {c.solicitado_en ? new Date(c.solicitado_en).toLocaleDateString('es-PE') : '—'}
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {c.revisado_por_username || '—'}
                        {c.revisado_en && <div style={{ fontSize:'0.72rem' }}>{new Date(c.revisado_en).toLocaleDateString('es-PE')}</div>}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          {c.estado !== 'publicado' && c.estado !== 'archivado' && (
                            <button
                              className={styles.btnPrimary}
                              onClick={() => doAccion('aprobar', c.slug)}
                              disabled={busy[c.slug + 'aprobar']}
                            >
                              <IconCheck /> Aprobar
                            </button>
                          )}
                          {c.estado !== 'rechazado' && c.estado !== 'archivado' && (
                            <button
                              className={styles.btnDanger}
                              onClick={() => setRechazando(c)}
                              disabled={busy[c.slug + 'rechazar']}
                            >
                              <IconX /> Rechazar
                            </button>
                          )}
                          {c.estado !== 'archivado' && (
                            <button
                              className={styles.btnAmber}
                              onClick={() => doAccion('archivar', c.slug)}
                              disabled={busy[c.slug + 'archivar']}
                            >
                              <IconArchive /> Archivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rechazando && (
        <RechazarModal
          curso={rechazando}
          onClose={() => setRechazando(null)}
          onConfirm={(motivo) => {
            doAccion('rechazar', rechazando.slug, motivo)
            setRechazando(null)
          }}
        />
      )}

      <div ref={toastRef} style={{ display: 'none' }} />
    </div>
  )
}

function RechazarModal({ curso, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Rechazar curso</h2>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>
        <div className={styles.modalBody}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem' }}>
            Indica el motivo de rechazo para <strong>{curso.titulo}</strong>.
          </p>
          <div className={styles.field}>
            <label className={styles.label}>Motivo de rechazo</label>
            <textarea
              className={styles.textarea}
              placeholder="Explica al instructor por qué se rechaza el curso…"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          <button
            className={styles.btnDanger}
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim()}
          >
            <IconX /> Confirmar rechazo
          </button>
        </div>
      </div>
    </div>
  )
}

function IconBook() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function IconCheck() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IconX() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconArchive() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> }
