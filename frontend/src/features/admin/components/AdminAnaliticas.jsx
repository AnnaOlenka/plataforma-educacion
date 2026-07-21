import { useEffect, useState } from 'react'
import { getPanelResumen } from '../services/adminService'
import api from '../../../services/api'
import styles from './Admin.module.css'

export default function AdminAnaliticas() {
  const [panel, setPanel] = useState(null)
  const [instructorData, setInstructorData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [p, i] = await Promise.allSettled([
          getPanelResumen(),
          api.get('/api/analytics/instructor/'),
        ])
        if (p.status === 'fulfilled') setPanel(p.value.data)
        if (i.status === 'fulfilled') setInstructorData(i.value.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Analíticas del sistema</h1>
          <p className={styles.pageDesc}>Métricas globales de la plataforma</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : (
        <>
          {/* Stats globales */}
          <div className={styles.statsGrid}>
            <StatCard cls={styles.statIconBlue} icon={<IconUsers />}
              value={panel?.usuarios_total ?? '—'} label="Usuarios totales" />
            <StatCard cls={styles.statIconGreen} icon={<IconCheck />}
              value={panel?.usuarios_activos ?? '—'} label="Usuarios activos" />
            <StatCard cls={styles.statIconIndigo} icon={<IconBook />}
              value={panel?.cursos_publicados ?? '—'} label="Cursos publicados" />
            <StatCard cls={styles.statIconAmber} icon={<IconClock />}
              value={panel?.cursos_pendientes ?? '—'} label="Cursos pendientes" />
            <StatCard cls={styles.statIconRed} icon={<IconShield />}
              value={panel?.auditorias_calificacion ?? '—'} label="Auditorías" />
          </div>

          {/* Tasas */}
          {panel && (
            <div className={styles.tableWrap} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.tableHead}>
                <p className={styles.tableTitle}>Tasas de la plataforma</p>
              </div>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <MetricBar
                  label="Activación de usuarios"
                  value={panel.usuarios_activos}
                  total={panel.usuarios_total}
                  color="#6366f1"
                />
                <MetricBar
                  label="Cursos publicados vs. pendientes"
                  value={panel.cursos_publicados}
                  total={(panel.cursos_publicados || 0) + (panel.cursos_pendientes || 0)}
                  color="#16a34a"
                />
              </div>
            </div>
          )}

          {/* Cursos del instructor (si el admin también es instructor o tiene datos) */}
          {instructorData?.cursos?.length > 0 && (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}>
                <p className={styles.tableTitle}>Progreso por curso</p>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Inscritos</th>
                    <th>Lecciones completadas</th>
                    <th>% Completado</th>
                    <th>Puntaje promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {instructorData.cursos.map((c) => (
                    <tr key={c.curso_id}>
                      <td><span className={styles.userName}>{c.titulo}</span></td>
                      <td>{c.inscritos ?? '—'}</td>
                      <td>{c.lecciones_completadas ?? '—'} / {c.lecciones_totales ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${c.porcentaje_completado || 0}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                            {Math.round(c.porcentaje_completado || 0)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        {c.desempeno?.promedio_puntaje != null ? (
                          <span className={`${styles.scorePill} ${c.desempeno.promedio_puntaje >= 60 ? styles.scoreOk : styles.scoreFail}`}>
                            {c.desempeno.promedio_puntaje.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!instructorData?.cursos?.length && (
            <div className={styles.tableWrap}>
              <div className={styles.stateWrap}>
                <div className={styles.stateIcon}><IconChart /></div>
                <p className={styles.stateTitle}>Analíticas de cursos no disponibles</p>
                <p className={styles.stateDesc}>Los datos de cursos aparecen aquí cuando existen inscripciones activas.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ cls, icon, value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.statIcon} ${cls}`}>{icon}</span>
      <span className={styles.statInfo}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </span>
    </div>
  )
}

function MetricBar({ label, value = 0, total = 0, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.84rem', fontWeight: 700, color }}>{value} / {total} ({pct}%)</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function IconUsers() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconCheck() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IconClock() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IconBook() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function IconShield() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IconChart() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
