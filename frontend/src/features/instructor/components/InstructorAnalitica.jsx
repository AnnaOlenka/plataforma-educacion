import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getAnalyticsCurso, getMisCursos, unwrap,
} from '../services/instructorService'
import { exportarInstructorPDF } from '../../progreso/services/progresoService'
import {
  IconChevron, IconUsers, IconChart, IconClock, IconAward, IconClipboard, IconArrowLeft,
} from './instructorUi'
import styles from './Instructor.module.css'

const iniciales = (n) => (n?.[0] || 'U').toUpperCase()

function fmtTiempo(seg) {
  seg = Math.max(0, Math.floor(seg || 0))
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m`
  return `${seg}s`
}

export default function InstructorAnalitica() {
  const { slug: slugParam } = useParams()
  const navigate = useNavigate()

  const [cursos, setCursos] = useState([])
  const [slug, setSlug] = useState(slugParam || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (slugParam) return
    ;(async () => {
      const { data: listaData } = await getMisCursos({ page_size: 50 })
      const lista = unwrap(listaData)
      setCursos(lista)
      if (lista.length && !slug) setSlug(lista[0].slug)
      else setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!slug) return
    let vivo = true
    setLoading(true)
    ;(async () => {
      try {
        const { data: analytics } = await getAnalyticsCurso(slug)
        if (vivo) setData(analytics)
      } catch {
        if (vivo) setData(null)
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [slug])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportarInstructorPDF()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dashboard-instructor.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  const m = data?.metricas || {}
  const estudiantes = data?.estudiantes || []
  const evaluaciones = data?.evaluaciones || []

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/instructor/cursos')}>Mis cursos</button>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>Analíticas{data ? ` · ${data.curso.titulo}` : ''}</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Analíticas del curso</h1>
          <p className={styles.pageDesc}>Progreso, tiempo y desempeño de tus estudiantes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!slugParam && cursos.length > 0 && (
            <select
              className={styles.select}
              style={{ width: 'auto', minWidth: 220 }}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {cursos.map((c) => (
                <option key={c.slug} value={c.slug}>{c.titulo}</option>
              ))}
            </select>
          )}
          <button className={styles.btnGhost} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
          {slugParam && (
            <button className={styles.btnGhost} onClick={() => navigate('/instructor/cursos')}>
              <IconArrowLeft /> Volver
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : !data ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconChart /></div>
          <p className={styles.stateTitle}>Sin datos de analíticas</p>
          <p className={styles.stateDesc}>Este curso aún no tiene estudiantes o actividad registrada.</p>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <Stat icon={<IconUsers />} cls={styles.statIconBlue} value={m.inscritos} label="Inscritos" />
            <Stat icon={<IconChart />} cls={styles.statIconIndigo} value={`${Math.round(m.promedio_progreso || 0)}%`} label="Progreso promedio" />
            <Stat icon={<IconAward />} cls={styles.statIconGreen} value={`${Math.round(m.desempeno_promedio || 0)}%`} label="Desempeño promedio" />
            <Stat icon={<IconClock />} cls={styles.statIconAmber} value={fmtTiempo(m.tiempo_total_segundos)} label="Tiempo total" />
          </div>

          {m.pendientes_revision > 0 && (
            <div className={styles.panel} style={{ marginBottom: '1.25rem' }}>
              <div className={styles.panelBody} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: '#92400e' }}>
                  <IconClipboard /> {m.pendientes_revision} intento(s) pendientes de revisión manual
                </span>
                <button className={styles.btnPrimary} onClick={() => navigate('/instructor/calificaciones')}>
                  Ir a calificaciones
                </button>
              </div>
            </div>
          )}

          <div className={styles.twoCol}>
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Estudiantes ({estudiantes.length})</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Progreso</th>
                      <th>Desempeño</th>
                      <th>Tiempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                          Sin estudiantes inscritos
                        </td>
                      </tr>
                    ) : estudiantes.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className={styles.tdStudent}>
                            <span className={styles.miniAvatar}>{iniciales(e.nombre)}</span>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.84rem' }}>{e.nombre}</div>
                              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{e.estado_inscripcion}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.miniTrack}>
                            <span className={styles.miniFill} style={{ width: `${e.progreso_pct}%` }} />
                          </span>
                          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#6b7280' }}>
                            {Math.round(e.progreso_pct)}%
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: e.desempeno_promedio >= 70 ? '#16a34a' : '#6b7280' }}>
                          {Math.round(e.desempeno_promedio)}%
                        </td>
                        <td style={{ color: '#9ca3af', fontSize: '0.82rem' }}>{fmtTiempo(e.tiempo_segundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Evaluaciones</h2>
              </div>
              <div className={styles.panelBody}>
                {evaluaciones.length === 0 ? (
                  <div className={styles.stateWrap} style={{ padding: '2rem 1rem' }}>
                    <p className={styles.stateDesc}>Este curso no tiene evaluaciones.</p>
                  </div>
                ) : evaluaciones.map((ev) => {
                  const tasa = ev.total_intentos
                    ? Math.round((ev.aprobados / ev.total_intentos) * 100)
                    : 0
                  return (
                    <div key={ev.id} style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f6f7f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.86rem' }}>{ev.titulo}</span>
                        {ev.pendientes_revision > 0 && (
                          <span className={styles.estadoBadge} style={{ background: '#fffbeb', color: '#d97706' }}>
                            {ev.pendientes_revision} por revisar
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: '#9ca3af', flexWrap: 'wrap' }}>
                        <span><IconClipboard /> {ev.total_intentos} intentos</span>
                        <span>Promedio: {Math.round(ev.promedio_puntaje || 0)}%</span>
                        <span>Aprobación: {tasa}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ icon, cls, value, label }) {
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
