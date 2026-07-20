import styles from './Cursos.module.css'
import {
  NivelBadge,
  CursoCover,
  ProgressBar,
  IconUser,
  IconLayers,
  IconPlay,
  IconUsers,
  IconCheck,
} from './cursosUi'

/**
 * Tarjeta de curso para el catálogo y "Mis cursos".
 *
 * @param {object}   curso        Datos del curso (CursoListSerializer).
 * @param {function} onOpen       Click en la tarjeta → detalle.
 * @param {function} onPrimary    Click en el botón principal.
 * @param {boolean}  loading      Botón en estado de carga.
 * @param {number}   progresoPct  Si se pasa, muestra barra de progreso.
 */
export default function CursoCard({ curso, onOpen, onPrimary, loading, progresoPct }) {
  const inscrito = curso.inscrito
  const mostrarProgreso = progresoPct != null

  return (
    <article className={styles.card} onClick={() => onOpen?.(curso)}>
      <CursoCover curso={curso}>
        <span className={styles.cardCoverBadge}>
          <NivelBadge nivel={curso.nivel} onCover />
        </span>
      </CursoCover>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{curso.titulo}</h3>
        <span className={styles.cardInstructor}>
          <IconUser />
          {curso.instructor_nombre?.trim() || 'Instructor EduPath'}
        </span>
        <p className={styles.cardDesc}>{curso.descripcion}</p>

        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>
            <IconLayers /> {curso.modulos_count ?? 0} módulos
          </span>
          <span className={styles.cardMetaItem}>
            <IconPlay /> {curso.lecciones_count ?? 0} lecciones
          </span>
          <span className={styles.cardMetaItem}>
            <IconUsers /> {curso.inscritos_count ?? 0}
          </span>
        </div>
      </div>

      {mostrarProgreso && <ProgressBar pct={progresoPct} />}

      <div className={styles.cardFooter}>
        {inscrito ? (
          <button
            className={styles.btnOutline}
            onClick={(e) => {
              e.stopPropagation()
              onPrimary?.(curso, 'continuar')
            }}
          >
            <IconPlay /> {mostrarProgreso && progresoPct >= 100 ? 'Repasar' : 'Continuar'}
          </button>
        ) : (
          <button
            className={styles.btnPrimary}
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation()
              onPrimary?.(curso, 'inscribir')
            }}
          >
            {loading ? 'Inscribiendo…' : (<><IconCheck /> Inscribirme</>)}
          </button>
        )}
      </div>
    </article>
  )
}
