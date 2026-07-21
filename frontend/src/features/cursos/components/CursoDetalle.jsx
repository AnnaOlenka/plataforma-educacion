import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getCursoDetalle,
  getResumenProgreso,
  inscribirCurso,
  cancelarInscripcion,
} from '../services/cursosService'
import useToast from '../hooks/useToast.jsx'
import {
  NivelBadge,
  LeccionTipoIcon,
  gradientFor,
  IconChevron,
  IconUser,
  IconLayers,
  IconPlay,
  IconUsers,
  IconClock,
  IconCheck,
  IconLock,
  TIPO_LABEL,
} from './cursosUi'
import styles from './CursoDetalle.module.css'

export default function CursoDetalle() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { toast, notify } = useToast()

  const [curso, setCurso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [abiertos, setAbiertos] = useState(() => new Set([0]))
  const [progreso, setProgreso] = useState(null) // { progreso_pct, completadas: Set }
  const [accion, setAccion] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await getCursoDetalle(slug)
      setCurso(data)
      if (data.inscrito) {
        try {
          const res = await getResumenProgreso(slug)
          const completadas = new Set(
            (res.data.marcadores || [])
              .filter((m) => m.estado === 'completada')
              .map((m) => m.leccion_id)
          )
          setProgreso({ progreso_pct: Number(res.data.progreso_pct) || 0, completadas })
        } catch {
          setProgreso({ progreso_pct: 0, completadas: new Set() })
        }
      } else {
        setProgreso(null)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    cargar()
  }, [cargar])

  const toggleModulo = (idx) => {
    setAbiertos((prev) => {
      const n = new Set(prev)
      n.has(idx) ? n.delete(idx) : n.add(idx)
      return n
    })
  }

  const onInscribir = async () => {
    setAccion(true)
    try {
      await inscribirCurso(slug)
      notify(`Te inscribiste en "${curso.titulo}"`)
      await cargar()
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo inscribir', 'error')
    } finally {
      setAccion(false)
    }
  }

  const onCancelar = async () => {
    if (!window.confirm('¿Cancelar tu inscripción a este curso? Conservarás tu progreso.'))
      return
    setAccion(true)
    try {
      await cancelarInscripcion(slug)
      notify('Inscripción cancelada')
      await cargar()
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo cancelar', 'error')
    } finally {
      setAccion(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.centered}>
          <div className={styles.spinner} />
          <p className={styles.sectionSub}>Cargando curso…</p>
        </div>
      </div>
    )
  }

  if (error || !curso) {
    return (
      <div className={styles.wrap}>
        <div className={styles.centered}>
          <p className={styles.sectionTitle}>No pudimos cargar este curso</p>
          <p className={styles.sectionSub}>Puede que no exista o no esté disponible.</p>
          <button className={styles.breadcrumbLink} onClick={() => navigate('/cursos/catalogo')}>
            ← Volver al catálogo
          </button>
        </div>
      </div>
    )
  }

  const modulos = curso.modulos || []
  const inscrito = curso.inscrito
  const pct = progreso?.progreso_pct ?? 0
  const done = pct >= 100

  return (
    <div className={styles.wrap}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/cursos')}>
          EduPath
        </button>
        <IconChevron />
        <button className={styles.breadcrumbLink} onClick={() => navigate('/cursos/catalogo')}>
          Catálogo
        </button>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>{curso.titulo}</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroInfo}>
          <div className={styles.heroBadges}>
            <NivelBadge nivel={curso.nivel} />
          </div>
          <h1 className={styles.heroTitle}>{curso.titulo}</h1>
          <p className={styles.heroDesc}>{curso.descripcion}</p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}>
              <IconUser />
              {curso.instructor_nombre?.trim() || 'Instructor EduPath'}
            </span>
            <span className={styles.metaItem}>
              <IconLayers /> <span className={styles.metaStrong}>{curso.modulos_count ?? modulos.length}</span> módulos
            </span>
            <span className={styles.metaItem}>
              <IconPlay /> <span className={styles.metaStrong}>{curso.lecciones_count ?? 0}</span> lecciones
            </span>
            <span className={styles.metaItem}>
              <IconUsers /> <span className={styles.metaStrong}>{curso.inscritos_count ?? 0}</span> inscritos
            </span>
          </div>
        </div>

        {/* Tarjeta de acción */}
        <div className={styles.heroCard}>
          <div className={styles.heroCover} style={{ background: gradientFor(curso) }}>
            {curso.portada ? (
              <img src={curso.portada} alt={curso.titulo} />
            ) : (
              (curso.titulo?.[0] || 'C').toUpperCase()
            )}
          </div>
          <div className={styles.heroCardBody}>
            {inscrito && (
              <div className={styles.progressBlock}>
                <div className={styles.progressRow}>
                  <span>{done ? 'Curso completado' : 'Tu progreso'}</span>
                  <span className={styles.progressPct}>{Math.round(pct)}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${done ? styles.progressFillDone : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {inscrito ? (
              <>
                <button
                  className={styles.btnPrimary}
                  onClick={() => navigate(`/cursos/${slug}/aprender`)}
                >
                  <IconPlay /> {done ? 'Repasar curso' : pct > 0 ? 'Continuar' : 'Empezar curso'}
                </button>
                <button className={styles.btnDanger} onClick={onCancelar} disabled={accion}>
                  Cancelar inscripción
                </button>
              </>
            ) : (
              <>
                <button className={styles.btnPrimary} onClick={onInscribir} disabled={accion}>
                  {accion ? 'Inscribiendo…' : (<><IconCheck /> Inscribirme gratis</>)}
                </button>
                <p className={styles.cardHint}>
                  Inscríbete para acceder a todas las lecciones y evaluaciones.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Temario */}
      <div>
        <h2 className={styles.sectionTitle}>Contenido del curso</h2>
        <p className={styles.sectionSub}>
          {modulos.length} módulos · {curso.lecciones_count ?? 0} lecciones
          {!inscrito && ' · inscríbete para desbloquear el contenido'}
        </p>

        {modulos.length === 0 ? (
          <div className={styles.centered}>
            <p className={styles.sectionSub}>Este curso todavía no tiene contenido publicado.</p>
          </div>
        ) : (
          modulos.map((modulo, idx) => {
            const open = abiertos.has(idx)
            const lecciones = modulo.lecciones || []
            return (
              <div key={modulo.id} className={styles.modulo}>
                <div className={styles.moduloHead} onClick={() => toggleModulo(idx)}>
                  <span className={styles.moduloNum}>{idx + 1}</span>
                  <span className={styles.moduloTitulo}>{modulo.titulo}</span>
                  <span className={styles.moduloCount}>{lecciones.length} lecciones</span>
                  <span className={`${styles.moduloChevron} ${open ? styles.moduloChevronOpen : ''}`}>
                    <IconChevron />
                  </span>
                </div>

                {open && (
                  <div className={styles.leccionList}>
                    {lecciones.map((lec) => {
                      const completada = progreso?.completadas?.has(lec.id)
                      const clickable = inscrito
                      return (
                        <div
                          key={lec.id}
                          className={`${styles.leccionItem} ${clickable ? styles.leccionItemClickable : ''}`}
                          onClick={() =>
                            clickable && navigate(`/cursos/${slug}/aprender?leccion=${lec.id}`)
                          }
                        >
                          <span className={`${styles.leccionIcon} ${completada ? styles.leccionIconDone : ''}`}>
                            {completada ? <IconCheck /> : <LeccionTipoIcon tipo={lec.tipo} />}
                          </span>
                          <span className={styles.leccionTitulo}>{lec.titulo}</span>
                          <span className={styles.leccionMeta}>
                            <span className={styles.leccionTipoTag}>
                              {TIPO_LABEL[lec.tipo] || lec.tipo}
                            </span>
                            <span className={styles.leccionDur}>
                              <IconClock /> {lec.duracion_minutos}m
                            </span>
                            {!inscrito && <span className={styles.leccionLock}><IconLock /></span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {toast}
    </div>
  )
}
