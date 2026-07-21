import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanel } from '../services/instructorService'
import { exportarInstructorPDF } from '../../progreso/services/progresoService'
import {
  IconBook, IconUsers, IconChart, IconClipboard,
  IconChevron, IconLayers,
} from './instructorUi'
import styles from './Instructor.module.css'

const iniciales = (nombre) => (nombre?.[0] || 'U').toUpperCase()

const ESTADO_ACT = {
  completada: 'completó',
  en_progreso: 'avanzó en',
  no_iniciada: 'abrió',
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

export default function InstructorDashboard() {
  const [panel, setPanel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await getPanel()
        if (vivo) setPanel(data)
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [])

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
      // silencioso
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.stateWrap}><div className={styles.spinner} /></div></div>
  }

  const cursos = panel?.cursos || []
  const actividad = panel?.actividad_reciente || []
  const totalEstudiantes = cursos.reduce((s, c) => s + (c.inscritos || 0), 0)
  const conDesempeno = cursos.filter((c) => c.intentos_evaluacion > 0)
  const desempeno = conDesempeno.length
    ? Math.round(conDesempeno.reduce((s, c) => s + c.desempeno_promedio, 0) / conDesempeno.length)
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Panel del instructor</h1>
          <p className={styles.pageDesc}>Contenido, quizzes, calificación y analíticas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={styles.btnGhost} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/instructor/cursos')}>
            <IconBook /> Gestionar cursos
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<IconBook />} cls={styles.statIconIndigo} value={cursos.length} label="Cursos creados" />
        <StatCard icon={<IconUsers />} cls={styles.statIconBlue} value={totalEstudiantes} label="Estudiantes inscritos" />
        <StatCard icon={<IconChart />} cls={styles.statIconGreen} value={`${desempeno}%`} label="Desempeño promedio" />
        <StatCard
          icon={<IconClipboard />}
          cls={styles.statIconAmber}
          value={panel?.pendientes_revision || 0}
          label="Pendientes de revisión"
          onClick={() => navigate('/instructor/calificaciones')}
        />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Mis cursos</h2>
            <button className={styles.btnGhost} onClick={() => navigate('/instructor/cursos')}>Ver todos</button>
          </div>
          <div className={styles.panelBody}>
            {cursos.length === 0 ? (
              <div className={styles.stateWrap} style={{ padding: '2.5rem 1rem' }}>
                <div className={styles.stateIcon}><IconBook /></div>
                <p className={styles.stateTitle}>Aún no has creado cursos</p>
                <button className={styles.btnPrimary} onClick={() => navigate('/instructor/cursos')}>Crear mi primer curso</button>
              </div>
            ) : (
              cursos.map((c) => (
                <div
                  key={c.id}
                  className={styles.activityRow}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/instructor/cursos/${c.slug}/editar`)}
                >
                  <span className={styles.activityAvatar}><IconBook /></span>
                  <div className={styles.activityText}>
                    <strong>{c.titulo}</strong>
                    <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: 2, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span><IconUsers /> {c.inscritos} inscritos</span>
                      <span><IconLayers /> {c.lecciones} lecciones</span>
                      <span>{Math.round(c.promedio_progreso)}% progreso</span>
                      <span>{c.tiempo_formato || '0s'}</span>
                    </div>
                  </div>
                  <IconChevron />
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Actividad reciente</h2>
            <button className={styles.btnGhost} onClick={() => navigate('/instructor/analiticas')}>Analíticas</button>
          </div>
          <div className={styles.panelBody}>
            {actividad.length === 0 ? (
              <div className={styles.stateWrap} style={{ padding: '2.5rem 1rem' }}>
                <p className={styles.stateDesc}>Todavía no hay actividad de estudiantes.</p>
              </div>
            ) : (
              actividad.map((a, i) => (
                <div key={i} className={styles.activityRow}>
                  <span className={styles.activityAvatar}>{iniciales(a.estudiante__username)}</span>
                  <div className={styles.activityText}>
                    <strong>{a.estudiante__username}</strong> {ESTADO_ACT[a.estado] || 'vio'}{' '}
                    <span style={{ color: '#4f46e5' }}>{a.leccion__titulo}</span>
                  </div>
                  <span className={styles.activityTime}>{tiempoRelativo(a.actualizado_en)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, cls, value, label, onClick }) {
  return (
    <div className={styles.statCard} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <span className={`${styles.statIcon} ${cls}`}>{icon}</span>
      <span className={styles.statInfo}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </span>
    </div>
  )
}
