import styles from './Cursos.module.css'

/* ── Helpers ── */
const NIVEL_CLASS = {
  basico: styles.nivelBasico,
  intermedio: styles.nivelIntermedio,
  avanzado: styles.nivelAvanzado,
}
const NIVEL_LABEL = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export function NivelBadge({ nivel, onCover = false }) {
  const key = (nivel || 'intermedio').toLowerCase()
  return (
    <span
      className={`${styles.nivelBadge} ${NIVEL_CLASS[key] || styles.nivelIntermedio} ${
        onCover ? styles.nivelOnCover : ''
      }`}
    >
      {NIVEL_LABEL[key] || nivel}
    </span>
  )
}

const ESTADO_INSC = {
  activa: { cls: styles.estadoActiva, label: 'En curso' },
  completada: { cls: styles.estadoCompletada, label: 'Completado' },
  cancelada: { cls: styles.estadoCancelada, label: 'Cancelado' },
}
export function EstadoInscripcionBadge({ estado }) {
  const cfg = ESTADO_INSC[estado] || ESTADO_INSC.activa
  return <span className={`${styles.estadoBadge} ${cfg.cls}`}>{cfg.label}</span>
}

/** Barra de progreso reutilizable. */
export function ProgressBar({ pct }) {
  const value = Math.min(100, Math.max(0, Number(pct) || 0))
  const done = value >= 100
  return (
    <div className={styles.cardProgress}>
      <div className={styles.progressRow}>
        <span>{done ? 'Completado' : 'Progreso'}</span>
        <span className={styles.progressPct}>{Math.round(value)}%</span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${done ? styles.progressFillDone : ''}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#8b5cf6',
]

/** Color sólido determinista según el curso (para portadas sin imagen). */
export function gradientFor(curso) {
  const idx = (curso?.id || curso?.titulo?.length || 0) % COLORS.length
  return COLORS[idx]
}

/** Portada del curso con placeholder degradado determinista. */
export function CursoCover({ curso, children }) {
  return (
    <div className={styles.cardCover} style={{ background: gradientFor(curso) }}>
      {curso.portada ? (
        <img src={curso.portada} alt={curso.titulo} />
      ) : (
        <div className={styles.cardCoverPlaceholder}>
          {(curso.titulo?.[0] || 'C').toUpperCase()}
        </div>
      )}
      {children}
    </div>
  )
}

/* ── Iconos ── */
export const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
)
export const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
export const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
export const IconLayers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
)
export const IconPlay = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
)
export const IconUsers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)
export const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
export const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
export const IconBookOpen = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
)
export const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
export const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
)
export const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
export const IconVideo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
)
export const IconFileText = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
)
export const IconQuiz = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /><circle cx="12" cy="12" r="10" /></svg>
)

/** Icono según el tipo de lección. */
export function LeccionTipoIcon({ tipo }) {
  switch (tipo) {
    case 'video': return <IconVideo />
    case 'quiz': return <IconQuiz />
    case 'recurso': return <IconFileText />
    default: return <IconFileText />
  }
}

export const TIPO_LABEL = {
  contenido: 'Lectura',
  video: 'Video',
  quiz: 'Evaluación',
  recurso: 'Recurso',
}
