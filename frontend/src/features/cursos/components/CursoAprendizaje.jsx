import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getNavegacion, getLeccion } from '../services/cursosService'
import useProgressTracker from '../hooks/useProgressTracker'
import useToast from '../hooks/useToast.jsx'
import {
  guardarLeccionOffline,
  leccionDisponibleOffline,
  leerLeccionOffline,
} from '../../../utils/offlineLecciones'
import {
  LeccionTipoIcon,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconFileText,
  IconChevron,
  IconQuiz,
  TIPO_LABEL,
} from './cursosUi'

const IconDownloadCloud = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
  </svg>
)
const IconOfflineDone = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
import styles from './CursoAprendizaje.module.css'

const API_BASE = 'http://localhost:8000'

/** Resuelve rutas de media relativas del backend. */
const mediaUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Convierte una URL de video en datos de incrustación. */
function resolverVideo(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (yt) return { tipo: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { tipo: 'file', src: url }
  return { tipo: 'link', src: url }
}

export default function CursoAprendizaje() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast, notify } = useToast()

  const [nav, setNav] = useState(null)
  const [loadingNav, setLoadingNav] = useState(true)
  const [error, setError] = useState('')
  const [completadas, setCompletadas] = useState(() => new Set())
  const [cursoPct, setCursoPct] = useState(0)

  const [activeId, setActiveId] = useState(null)
  const [leccion, setLeccion] = useState(null)
  const [loadingLeccion, setLoadingLeccion] = useState(false)
  const [modoOffline, setModoOffline] = useState(false)
  const [descargada, setDescargada] = useState(false)

  // Lista plana ordenada de lecciones (para prev/next y estado).
  const flat = useMemo(() => {
    if (!nav) return []
    const out = []
    ;(nav.modulos || []).forEach((m, mIdx) => {
      ;(m.lecciones || []).forEach((l) => {
        out.push({ ...l, moduloIdx: mIdx, moduloTitulo: m.titulo })
      })
    })
    return out
  }, [nav])

  const activeIdx = flat.findIndex((l) => l.id === activeId)

  /* ── Carga inicial de la navegación ── */
  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoadingNav(true)
      setError('')
      try {
        const { data } = await getNavegacion(slug)
        if (!vivo) return
        setNav(data)
        setCursoPct(Number(data.curso?.progreso_pct) || 0)
        const done = new Set()
        const todas = []
        ;(data.modulos || []).forEach((m) =>
          (m.lecciones || []).forEach((l) => {
            todas.push(l)
            if (l.progreso?.estado === 'completada') done.add(l.id)
          })
        )
        setCompletadas(done)

        // Lección inicial: query param → primera no completada → primera.
        const pedida = Number(searchParams.get('leccion'))
        const existe = todas.find((l) => l.id === pedida)
        const primeraPendiente = todas.find((l) => l.progreso?.estado !== 'completada')
        setActiveId(existe ? pedida : (primeraPendiente || todas[0])?.id ?? null)
      } catch (err) {
        if (!vivo) return
        setError(
          err.response?.status === 403
            ? 'Debes inscribirte en este curso para acceder al contenido.'
            : 'No se pudo cargar el contenido del curso.'
        )
      } finally {
        if (vivo) setLoadingNav(false)
      }
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  /* ── Carga de la lección activa (con fallback offline) ── */
  useEffect(() => {
    if (!activeId) return
    let vivo = true
    ;(async () => {
      setLoadingLeccion(true)
      try {
        const { data } = await getLeccion(activeId)
        if (!vivo) return
        setLeccion(data)
        setModoOffline(false)
      } catch {
        const guardada = await leerLeccionOffline(activeId)
        if (!vivo) return
        if (guardada) {
          setLeccion(guardada)
          setModoOffline(true)
          notify('Sin conexión: mostrando versión descargada', 'success')
        } else {
          notify('No se pudo cargar la lección', 'error')
        }
      } finally {
        if (vivo) setLoadingLeccion(false)
      }
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  /* ── Estado de descarga offline de la lección activa ── */
  useEffect(() => {
    if (!activeId) return
    let vivo = true
    leccionDisponibleOffline(activeId).then((ok) => vivo && setDescargada(ok))
    return () => {
      vivo = false
    }
  }, [activeId, leccion])

  const onDescargarOffline = async () => {
    if (!leccion) return
    const ok = await guardarLeccionOffline(activeId, leccion)
    if (ok) {
      setDescargada(true)
      notify('Lección disponible sin conexión', 'success')
    } else {
      notify('Este navegador no soporta descarga offline', 'error')
    }
  }

  const onCursoProgreso = useCallback((pct) => setCursoPct(pct), [])

  const tracker = useProgressTracker(activeId, {
    porcentajeInicial: leccion?.progreso?.porcentaje ?? 0,
    estadoInicial: leccion?.progreso?.estado ?? 'no_iniciada',
    onCursoProgreso,
  })

  const seleccionar = (id) => {
    tracker.flush()
    setActiveId(id)
    setSearchParams({ leccion: String(id) }, { replace: true })
    document.querySelector(`.${styles.content}`)?.scrollTo({ top: 0 })
  }

  const irPrev = () => activeIdx > 0 && seleccionar(flat[activeIdx - 1].id)
  const irNext = () => activeIdx < flat.length - 1 && seleccionar(flat[activeIdx + 1].id)

  const yaCompletada = completadas.has(activeId)

  const onCompletar = async () => {
    try {
      await tracker.marcarCompletada()
      setCompletadas((prev) => new Set(prev).add(activeId))
      if (activeIdx < flat.length - 1) {
        setTimeout(() => seleccionar(flat[activeIdx + 1].id), 400)
      } else {
        notify('¡Felicidades! Completaste el curso', 'success')
      }
    } catch {
      notify('No se pudo guardar el progreso', 'error')
    }
  }

  /* ── Render ── */
  if (loadingNav) {
    return (
      <div className={styles.shell}>
        <div className={styles.centered}>
          <div className={styles.spinner} />
          <p className={styles.mutedText}>Cargando contenido…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.shell}>
        <div className={styles.centered}>
          <p className={styles.mutedText}>{error}</p>
          <button className={styles.navBtn} onClick={() => navigate(`/cursos/${slug}`)}>
            <IconArrowLeft /> Volver al curso
          </button>
        </div>
      </div>
    )
  }

  const done = cursoPct >= 100

  return (
    <div className={styles.shell}>
      {/* Sidebar temario */}
      <aside className={styles.aside}>
        <div className={styles.asideHead}>
          <button className={styles.backLink} onClick={() => navigate(`/cursos/${slug}`)}>
            <IconArrowLeft /> Volver al curso
          </button>
          <h2 className={styles.asideTitle}>{nav.curso?.titulo}</h2>
          <div className={styles.progressRow}>
            <span>{done ? 'Completado' : 'Progreso del curso'}</span>
            <span className={styles.progressPct}>{Math.round(cursoPct)}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${done ? styles.progressFillDone : ''}`}
              style={{ width: `${cursoPct}%` }}
            />
          </div>
        </div>

        <div className={styles.asideScroll}>
          {(nav.modulos || []).map((modulo, mIdx) => (
            <div key={modulo.id} className={styles.moduloGroup}>
              <div className={styles.moduloLabel}>
                <span className={styles.moduloLabelNum}>{mIdx + 1}</span>
                {modulo.titulo}
              </div>
              {(modulo.lecciones || []).map((lec) => {
                const esActiva = lec.id === activeId
                const completa = completadas.has(lec.id)
                const enProgreso = !completa && lec.progreso?.estado === 'en_progreso'
                return (
                  <button
                    key={lec.id}
                    className={`${styles.leccionBtn} ${esActiva ? styles.leccionBtnActive : ''}`}
                    onClick={() => seleccionar(lec.id)}
                  >
                    <span
                      className={`${styles.leccionState} ${
                        completa
                          ? styles.leccionStateDone
                          : enProgreso
                          ? styles.leccionStateProgress
                          : esActiva
                          ? styles.leccionStateActive
                          : ''
                      }`}
                    >
                      {completa ? <IconCheck /> : <LeccionTipoIcon tipo={lec.tipo} />}
                    </span>
                    <span className={styles.leccionInfo}>
                      <span className={`${styles.leccionName} ${esActiva ? styles.leccionNameActive : ''}`}>
                        {lec.titulo}
                      </span>
                      <span className={styles.leccionSub}>
                        {TIPO_LABEL[lec.tipo] || lec.tipo} · {lec.duracion_minutos}m
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Panel de contenido */}
      <div className={styles.content}>
        <div className={styles.contentInner}>
          {loadingLeccion || !leccion ? (
            <div className={styles.centered}>
              <div className={styles.spinner} />
            </div>
          ) : (
            <>
              <div className={styles.leccionHeader}>
                <div className={styles.leccionHeaderTop}>
                  <span className={styles.leccionTag}>
                    <LeccionTipoIcon tipo={leccion.tipo} />
                    {TIPO_LABEL[leccion.tipo] || leccion.tipo}
                  </span>
                  <button
                    type="button"
                    className={`${styles.offlineBtn} ${descargada ? styles.offlineBtnDone : ''}`}
                    onClick={onDescargarOffline}
                    disabled={descargada || modoOffline}
                    title={descargada ? 'Disponible sin conexión' : 'Guardar para leer sin conexión'}
                  >
                    {descargada ? <IconOfflineDone /> : <IconDownloadCloud />}
                    {descargada ? 'Offline' : 'Guardar offline'}
                  </button>
                </div>
                <h1 className={styles.leccionH1}>{leccion.titulo}</h1>
                <div className={styles.leccionMetaRow}>
                  <span className={styles.leccionMetaItem}>
                    <IconClock /> {leccion.duracion_minutos} min
                  </span>
                  {activeIdx >= 0 && (
                    <span className={styles.leccionMetaItem}>
                      Lección {activeIdx + 1} de {flat.length}
                    </span>
                  )}
                  {modoOffline && (
                    <span className={styles.leccionMetaItem}>📴 Modo offline</span>
                  )}
                </div>
              </div>

              <LeccionContenido
                leccion={leccion}
                onIrEvaluacion={() => navigate(`/evaluaciones/leccion/${leccion.id}?slug=${slug}`)}
              />
            </>
          )}
        </div>

        {/* Barra de acciones */}
        {leccion && (
          <div className={styles.footer}>
            <button className={styles.navBtn} onClick={irPrev} disabled={activeIdx <= 0}>
              <IconArrowLeft /> Anterior
            </button>

            <button
              className={`${styles.completeBtn} ${yaCompletada ? styles.completeBtnDone : ''}`}
              onClick={onCompletar}
              disabled={tracker.guardando || yaCompletada}
            >
              {yaCompletada ? (
                <><IconCheck /> Completada</>
              ) : tracker.guardando ? (
                'Guardando…'
              ) : (
                <><IconCheck /> Marcar como completada</>
              )}
            </button>

            <button
              className={styles.navBtn}
              onClick={irNext}
              disabled={activeIdx >= flat.length - 1}
            >
              Siguiente <IconArrowRight />
            </button>
          </div>
        )}
      </div>

      {toast}
    </div>
  )
}

/* ── Cuerpo de la lección según tipo ── */
const IMG_EXT = /\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i

function LeccionContenido({ leccion, onIrEvaluacion }) {
  const video = leccion.tipo === 'video' ? resolverVideo(leccion.recurso_url) : null
  const archivo = mediaUrl(leccion.archivo)
  const esImagen = archivo && IMG_EXT.test(archivo)
  const tieneContenido = leccion.contenido?.trim()

  return (
    <>
      {/* Video incrustado */}
      {video?.tipo === 'iframe' && (
        <div className={styles.videoWrap}>
          <iframe src={video.src} title={leccion.titulo} allowFullScreen allow="encrypted-media" />
        </div>
      )}
      {video?.tipo === 'file' && (
        <div className={styles.videoWrap}>
          <video src={video.src} controls />
        </div>
      )}

      {/* Evaluación */}
      {leccion.tipo === 'quiz' && (
        <a className={styles.resourceCard} onClick={onIrEvaluacion} style={{ cursor: 'pointer' }}>
          <span className={styles.resourceIcon}><IconQuiz /></span>
          <span className={styles.resourceText}>
            <span className={styles.resourceTitle}>Esta lección incluye una evaluación</span>
            <span className={styles.resourceSub}>Pon a prueba lo aprendido</span>
          </span>
          <span className={styles.resourceArrow}><IconChevron /></span>
        </a>
      )}

      {/* Imagen adjunta inline */}
      {esImagen && (
        <div className={styles.leccionImgWrap}>
          <img src={archivo} alt={leccion.titulo} className={styles.leccionImg} />
        </div>
      )}

      {/* Contenido textual */}
      {tieneContenido ? (
        <div className={styles.prose}>{leccion.contenido}</div>
      ) : (
        !video && leccion.tipo !== 'quiz' && !archivo && (
          <div className={styles.emptyContent}>
            El instructor aún no ha agregado contenido a esta lección.
          </div>
        )
      )}

      {/* Archivo descargable (no imagen) */}
      {archivo && !esImagen && (
        <a className={styles.resourceCard} href={archivo} target="_blank" rel="noreferrer">
          <span className={styles.resourceIcon}><IconFileText /></span>
          <span className={styles.resourceText}>
            <span className={styles.resourceTitle}>Material de la lección</span>
            <span className={styles.resourceSub}>Descargar archivo adjunto</span>
          </span>
          <span className={styles.resourceArrow}><IconChevron /></span>
        </a>
      )}
      {video?.tipo === 'link' && leccion.recurso_url && (
        <a className={styles.resourceCard} href={leccion.recurso_url} target="_blank" rel="noreferrer">
          <span className={styles.resourceIcon}><IconFileText /></span>
          <span className={styles.resourceText}>
            <span className={styles.resourceTitle}>Recurso externo</span>
            <span className={styles.resourceSub}>{leccion.recurso_url}</span>
          </span>
          <span className={styles.resourceArrow}><IconChevron /></span>
        </a>
      )}
    </>
  )
}
