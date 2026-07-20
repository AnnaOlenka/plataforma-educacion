import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMisInscripciones,
  getCursoDetalle,
  unwrapList,
} from '../../cursos/services/cursosService'
import { IconChevron, IconList, IconClock, IconTarget } from './evaluacionesUi'
import styles from './Evaluaciones.module.css'

export default function EvaluacionesIndex() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoading(true)
      try {
        const insRes = await getMisInscripciones({ page_size: 50 })
        const inscripciones = unwrapList(insRes.data).filter((i) => i.estado !== 'cancelada')

        // Para cada curso inscrito, extrae las lecciones tipo quiz.
        const detalles = await Promise.all(
          inscripciones.map((i) => getCursoDetalle(i.curso_slug).catch(() => null))
        )
        if (!vivo) return

        const items = []
        detalles.forEach((res) => {
          if (!res) return
          const curso = res.data
          ;(curso.modulos || []).forEach((m) =>
            (m.lecciones || []).forEach((lec) => {
              if (lec.tipo === 'quiz') {
                items.push({
                  leccionId: lec.id,
                  titulo: lec.titulo,
                  cursoTitulo: curso.titulo,
                  cursoSlug: curso.slug,
                  modulo: m.titulo,
                  duracion: lec.duracion_minutos,
                })
              }
            })
          )
        })
        setQuizzes(items)
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  const abrir = (q) =>
    navigate(`/evaluaciones/leccion/${q.leccionId}?slug=${q.cursoSlug}`)

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <span style={{ color: '#6b7280', fontWeight: 500 }}>EduPath</span>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>Evaluaciones</span>
      </div>

      <div className={styles.pageHeader}>
        <div className={styles.pageTitleRow}>
          <h1 className={styles.pageTitle}>Evaluaciones</h1>
          {!loading && <span className={styles.countBadge}>{quizzes.length}</span>}
        </div>
        <p className={styles.pageDesc}>
          Evaluaciones interactivas de tus cursos con validación en tiempo real
        </p>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : quizzes.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconList /></div>
          <p className={styles.stateTitle}>Aún no tienes evaluaciones</p>
          <p className={styles.stateDesc}>
            Inscríbete en cursos con evaluaciones interactivas para verlas aquí.
          </p>
          <button className={styles.btnPrimary} onClick={() => navigate('/cursos/catalogo')}>
            Explorar catálogo
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {quizzes.map((q) => (
            <article key={q.leccionId} className={styles.quizCard} onClick={() => abrir(q)}>
              <div className={styles.quizIconRow}>
                <span className={styles.quizIcon}><IconList /></span>
                <span className={`${styles.attemptPill} ${styles.attemptNuevo}`}>
                  <IconTarget /> Interactiva
                </span>
              </div>
              <span className={styles.quizCurso}>{q.cursoTitulo} · {q.modulo}</span>
              <h3 className={styles.quizTitle}>{q.titulo}</h3>
              <div className={styles.quizMeta}>
                <span className={styles.quizMetaItem}><IconClock /> {q.duracion} min</span>
                <span className={styles.quizMetaItem}><IconChevron /> Comenzar</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
