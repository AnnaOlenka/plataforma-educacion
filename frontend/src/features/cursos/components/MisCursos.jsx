import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCursos,
  getMisInscripciones,
  unwrapList,
} from '../services/cursosService'
import CursoCard from './CursoCard'
import { IconChevron, IconBookOpen } from './cursosUi'
import styles from './Cursos.module.css'

const FILTROS = [
  { v: 'activa', l: 'En curso' },
  { v: 'completada', l: 'Completados' },
  { v: '', l: 'Todos' },
]

export default function MisCursos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('activa')
  const navigate = useNavigate()

  useEffect(() => {
    let activo = true
    ;(async () => {
      setLoading(true)
      try {
        // Inscripciones (progreso/estado) + catálogo (datos ricos del curso).
        const [insRes, curRes] = await Promise.all([
          getMisInscripciones({ page_size: 50 }),
          getCursos({ page_size: 50 }),
        ])
        if (!activo) return
        const inscripciones = unwrapList(insRes.data).filter(
          (i) => i.estado !== 'cancelada'
        )
        const cursosById = {}
        unwrapList(curRes.data).forEach((c) => {
          cursosById[c.id] = c
        })
        const merged = inscripciones.map((ins) => ({
          inscripcion: ins,
          curso: {
            ...(cursosById[ins.curso] || {}),
            id: ins.curso,
            titulo: ins.curso_titulo,
            slug: ins.curso_slug,
            nivel: ins.curso_nivel,
            inscrito: true,
          },
          progreso_pct: Number(ins.progreso_pct) || 0,
          estado: ins.estado,
        }))
        setItems(merged)
      } finally {
        if (activo) setLoading(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [])

  const visibles = useMemo(
    () => (filtro ? items.filter((i) => i.estado === filtro) : items),
    [items, filtro]
  )

  const abrirDetalle = (curso) => navigate(`/cursos/${curso.slug}`)
  const onPrimary = (curso) => navigate(`/cursos/${curso.slug}/aprender`)

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbRoot}>EduPath</span>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>Mis cursos</span>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Mis cursos</h1>
            {!loading && <span className={styles.countBadge}>{items.length}</span>}
          </div>
          <p className={styles.pageDesc}>Continúa donde lo dejaste y sigue tu progreso</p>
        </div>
        <button className={styles.btnGhost} onClick={() => navigate('/cursos/catalogo')}>
          Explorar catálogo
        </button>
      </div>

      {!loading && items.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.segmented}>
            {FILTROS.map((f) => (
              <button
                key={f.v}
                className={`${styles.segment} ${filtro === f.v ? styles.segmentActive : ''}`}
                onClick={() => setFiltro(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.skelGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skelCard} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconBookOpen /></div>
          <p className={styles.stateTitle}>Todavía no estás inscrito en ningún curso</p>
          <p className={styles.stateDesc}>
            Explora el catálogo y encuentra el curso perfecto para empezar tu ruta de aprendizaje.
          </p>
          <button
            className={styles.btnPrimary}
            style={{ width: 'auto', padding: '0 1.4rem' }}
            onClick={() => navigate('/cursos/catalogo')}
          >
            Ir al catálogo
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconBookOpen /></div>
          <p className={styles.stateTitle}>Sin cursos en esta categoría</p>
          <p className={styles.stateDesc}>Cambia el filtro para ver el resto de tus cursos.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibles.map(({ curso, progreso_pct }) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              onOpen={abrirDetalle}
              onPrimary={onPrimary}
              progresoPct={progreso_pct}
            />
          ))}
        </div>
      )}
    </div>
  )
}
