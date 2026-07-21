import { useEffect, useRef, useState } from 'react'
import { getAuditoria, unwrap } from '../services/adminService'
import styles from './Admin.module.css'

const ACCION_INFO = {
  auto: { label: 'Auto-calificado', color: '#6b7280', bg: '#f3f4f6' },
  manual: { label: 'Manual', color: '#d97706', bg: '#fffbeb' },
  revision: { label: 'Revisión', color: '#6366f1', bg: '#eef2ff' },
  correccion: { label: 'Corrección', color: '#dc2626', bg: '#fef2f2' },
}

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const toastRef = useRef(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page_size: 100 }
      if (search) params.search = search
      if (filtroAccion) params.accion = filtroAccion
      const { data } = await getAuditoria(params)
      setLogs(unwrap(data))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [search, filtroAccion]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Auditoría de calificaciones</h1>
            {!loading && <span className={styles.countBadge}>{logs.length}</span>}
          </div>
          <p className={styles.pageDesc}>Historial completo de cambios de calificaciones en la plataforma</p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2 className={styles.tableTitle}>Registros</h2>
          <div className={styles.tableControls}>
            <input
              className={styles.searchInput}
              placeholder="Buscar actor, estudiante, evaluación…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.select} value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
              <option value="">Todas las acciones</option>
              <option value="auto">Auto-calificado</option>
              <option value="manual">Manual</option>
              <option value="revision">Revisión</option>
              <option value="correccion">Corrección</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.stateWrap}><div className={styles.spinner} /></div>
        ) : logs.length === 0 ? (
          <div className={styles.stateWrap}>
            <div className={styles.stateIcon}><IconShield /></div>
            <p className={styles.stateTitle}>Sin registros de auditoría</p>
            <p className={styles.stateDesc}>Los cambios de calificaciones se registrarán aquí automáticamente.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Estudiante</th>
                  <th>Evaluación</th>
                  <th>Acción</th>
                  <th>Puntaje anterior</th>
                  <th>Puntaje nuevo</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const ai = ACCION_INFO[log.accion] || ACCION_INFO.auto
                  return (
                    <tr key={log.id}>
                      <td>
                        <div className={styles.tdUser}>
                          <span className={styles.avatar}>{(log.actor_username?.[0] || 'A').toUpperCase()}</span>
                          <span className={styles.userName}>{log.actor_username}</span>
                        </div>
                      </td>
                      <td style={{ color: '#374151', fontSize: '0.84rem' }}>{log.estudiante_username || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.83rem' }}>{log.evaluacion_titulo || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{log.curso_titulo || ''}</div>
                      </td>
                      <td>
                        <span className={styles.badge} style={{ background: ai.bg, color: ai.color }}>{ai.label}</span>
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.83rem', textAlign: 'center' }}>
                        {log.puntaje_anterior != null ? `${Math.round(log.puntaje_anterior)}%` : '—'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#111827', fontSize: '0.83rem', textAlign: 'center' }}>
                        {log.puntaje_nuevo != null ? `${Math.round(log.puntaje_nuevo)}%` : '—'}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.78rem', maxWidth: 220 }}>
                        {log.motivo || <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.creado_en).toLocaleString('es-PE')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div ref={toastRef} style={{ display: 'none' }} />
    </div>
  )
}

function IconShield() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
