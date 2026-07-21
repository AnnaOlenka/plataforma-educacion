import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getEvaluacionPorLeccion,
  getMisIntentos,
  iniciarIntento,
  validarRespuesta,
  enviarIntento,
} from '../services/evaluacionesService'
import { completarLeccion } from '../../cursos/services/cursosService'
import HotspotCanvas from './HotspotCanvas'
import DragDropCanvas from './DragDropCanvas'
import DibujoCanvas from './DibujoCanvas'
import {
  IconChevron, IconClock, IconTarget, IconAward, IconCheck, IconX,
  IconList, IconArrowRight, IconRefresh, TIPO_LABEL, TipoIcon,
} from './evaluacionesUi'
import styles from './Evaluaciones.module.css'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function EvaluacionRunner() {
  const { leccionId } = useParams()
  const [searchParams] = useSearchParams()
  const slug = searchParams.get('slug')
  const navigate = useNavigate()

  const [fase, setFase] = useState('intro') // intro | curso | resultado
  const [evaluacion, setEvaluacion] = useState(null)
  const [intentoId, setIntentoId] = useState(null)
  const [intentosPrevios, setIntentosPrevios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [respuestas, setRespuestas] = useState({}) // { pid: valor } (opción/V-F)
  const [canvasPayload, setCanvasPayload] = useState({}) // { pid: item }
  const [feedback, setFeedback] = useState({}) // { pid: { correcta, mensaje } }
  const [resultado, setResultado] = useState(null)
  const [segundos, setSegundos] = useState(0)

  const timersRef = useRef({})

  /* ── Carga inicial ── */
  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await getEvaluacionPorLeccion(leccionId)
        if (!vivo) return
        setEvaluacion(data)
        try {
          const int = await getMisIntentos(data.id)
          if (vivo) setIntentosPrevios(int.data || [])
        } catch { /* sin intentos previos */ }
      } catch (err) {
        if (vivo)
          setError(
            err.response?.status === 404
              ? 'Esta lección todavía no tiene una evaluación disponible.'
              : 'No se pudo cargar la evaluación.'
          )
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [leccionId])

  /* ── Temporizador ── */
  useEffect(() => {
    if (fase !== 'curso') return
    if (segundos <= 0) return
    const id = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [fase, segundos > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const preguntas = evaluacion?.preguntas || []

  const contestadas = useMemo(() => {
    let n = 0
    preguntas.forEach((p) => {
      if (esCanvas(p.tipo)) {
        const item = canvasPayload[p.id]
        if (item && Object.keys(item).length && !vacioCanvas(p.tipo, item)) n++
      } else if (respuestas[p.id] !== undefined) n++
    })
    return n
  }, [preguntas, respuestas, canvasPayload])

  /* ── Iniciar intento ── */
  const iniciar = async () => {
    try {
      const { data } = await iniciarIntento(evaluacion.id)
      setIntentoId(data.intento_id)
      setSegundos(data.tiempo_limite_seg || evaluacion.tiempo_limite_seg || 600)
      setRespuestas({})
      setCanvasPayload({})
      setFeedback({})
      setResultado(null)
      setFase('curso')
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo iniciar el intento.')
    }
  }

  /* ── Validación en tiempo real (debounce) ── */
  const validar = useCallback(
    (pregunta, { respuesta, canvas_payload }) => {
      clearTimeout(timersRef.current[pregunta.id])
      timersRef.current[pregunta.id] = setTimeout(async () => {
        try {
          const { data } = await validarRespuesta(evaluacion.id, {
            pregunta_id: pregunta.id,
            respuesta,
            canvas_payload,
          })
          setFeedback((f) => ({
            ...f,
            [pregunta.id]: { correcta: data.correcta, mensaje: data.feedback },
          }))
        } catch { /* validación best-effort */ }
      }, 350)
    },
    [evaluacion]
  )

  const responderSimple = (pregunta, valor) => {
    setRespuestas((r) => ({ ...r, [pregunta.id]: valor }))
    validar(pregunta, { respuesta: valor, canvas_payload: {} })
  }

  const responderCanvas = (pregunta, item) => {
    setCanvasPayload((c) => ({ ...c, [pregunta.id]: item }))
    validar(pregunta, { respuesta: null, canvas_payload: item })
  }

  /* ── Enviar intento ── */
  const enviar = useCallback(async () => {
    setEnviando(true)
    try {
      const { data } = await enviarIntento(evaluacion.id, {
        intento_id: intentoId,
        respuestas,
        canvas_payload: canvasPayload,
      })
      setResultado(data)
      setFase('resultado')
      if (data.aprobado && leccionId) {
        completarLeccion(Number(leccionId)).catch(() => {})
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo enviar la evaluación.')
    } finally {
      setEnviando(false)
    }
  }, [evaluacion, intentoId, respuestas, canvasPayload, leccionId])

  // Auto-envío al agotarse el tiempo.
  useEffect(() => {
    if (fase === 'curso' && segundos === 0 && intentoId) enviar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundos, fase])

  const volver = () => navigate(slug ? `/cursos/${slug}/aprender` : '/evaluaciones')

  /* ── Render ── */
  if (loading) {
    return <Shell><div className={styles.stateWrap}><div className={styles.spinner} /></div></Shell>
  }
  if (error && !evaluacion) {
    return (
      <Shell>
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconList /></div>
          <p className={styles.stateTitle}>Evaluación no disponible</p>
          <p className={styles.stateDesc}>{error}</p>
          <button className={styles.btnGhost} onClick={volver}>Volver</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={volver}>
          {slug ? 'Curso' : 'Evaluaciones'}
        </button>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>{evaluacion.titulo}</span>
      </div>

      {fase === 'intro' && (
        <Intro
          evaluacion={evaluacion}
          intentos={intentosPrevios}
          onIniciar={iniciar}
        />
      )}

      {fase === 'curso' && (
        <>
          <div className={styles.runnerHead}>
            <div className={styles.runnerProgress}>
              <div className={styles.runnerProgressText}>
                <span>Progreso</span>
                <span>{contestadas} / {preguntas.length} contestadas</span>
              </div>
              <div className={styles.runnerTrack}>
                <div className={styles.runnerFill} style={{ width: `${(contestadas / preguntas.length) * 100}%` }} />
              </div>
            </div>
            <div className={`${styles.timer} ${segundos < 60 ? styles.timerWarn : ''}`}>
              <IconClock /> {fmt(segundos)}
            </div>
          </div>

          {preguntas.map((p, idx) => (
            <Pregunta
              key={p.id}
              pregunta={p}
              index={idx}
              schema={evaluacion.canvas_schema}
              respuesta={respuestas[p.id]}
              canvasItem={canvasPayload[p.id]}
              feedback={feedback[p.id]}
              onSimple={responderSimple}
              onCanvas={responderCanvas}
            />
          ))}

          <div className={styles.runnerFooter}>
            <span className={styles.answeredCount}>
              Has contestado <strong>{contestadas}</strong> de <strong>{preguntas.length}</strong>
            </span>
            <button
              className={styles.btnPrimary}
              onClick={enviar}
              disabled={enviando || contestadas === 0}
            >
              {enviando ? 'Enviando…' : (<>Enviar evaluación <IconArrowRight /></>)}
            </button>
          </div>
        </>
      )}

      {fase === 'resultado' && resultado && (
        <Resultado
          evaluacion={evaluacion}
          resultado={resultado}
          preguntas={preguntas}
          onReintentar={() => setFase('intro')}
          onVolver={volver}
        />
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return <div className={styles.wrap}>{children}</div>
}

/* ── Intro ── */
function Intro({ evaluacion, intentos, onIniciar }) {
  const finalizados = intentos.filter((i) => i.estado !== 'en_curso')
  const mejor = finalizados.reduce((m, i) => Math.max(m, Number(i.puntaje) || 0), 0)
  const totalPts = (evaluacion.preguntas || []).reduce((s, p) => s + (p.puntaje || 0), 0)

  return (
    <div className={styles.introCard}>
      {/* Columna izquierda: descripción + stats */}
      <div className={styles.introHero}>
        <div className={styles.introHeroIcon}><IconList /></div>
        <span className={styles.introEvalTag}><IconTarget /> Evaluación</span>
        <h1 className={styles.introTitle}>{evaluacion.titulo}</h1>
        <p className={styles.introSub}>Evaluación interactiva con retroalimentación en tiempo real.</p>

        <div className={styles.introStats}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{evaluacion.preguntas?.length || 0}</div>
            <div className={styles.statLabel}>Preguntas</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{Math.round((evaluacion.tiempo_limite_seg || 600) / 60)}′</div>
            <div className={styles.statLabel}>Tiempo límite</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{evaluacion.puntaje_aprobacion}%</div>
            <div className={styles.statLabel}>Para aprobar</div>
          </div>
        </div>
      </div>

      {/* Columna derecha: intentos + tips + botón */}
      <div className={styles.introBody}>
        {finalizados.length > 0 && (
          <div>
            <h2 className={styles.introBodyTitle}>Intentos anteriores</h2>
            <div className={styles.attemptList}>
              {finalizados.slice(0, 3).map((i) => (
                <div key={i.id} className={styles.attemptRow}>
                  <span className={styles.attemptRowLeft}>
                    <IconClock /> {new Date(i.finalizado_en || i.iniciado_en).toLocaleDateString('es-PE')}
                  </span>
                  <span className={styles.attemptScore} style={{ color: i.aprobado ? '#16a34a' : '#dc2626' }}>
                    {Math.round(Number(i.puntaje))}% · {i.aprobado ? 'Aprobado' : 'No aprobado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className={styles.introBodyTitle}>A tener en cuenta</h2>
          <ul className={styles.tipsList}>
            <li className={styles.tipItem}><IconTarget /> Vale {totalPts} pts en total; necesitas {evaluacion.puntaje_aprobacion}% para aprobar.</li>
            <li className={styles.tipItem}><IconCheck /> Recibes retroalimentación instantánea al responder.</li>
            <li className={styles.tipItem}><IconClock /> El intento se envía automáticamente al agotarse el tiempo.</li>
          </ul>
        </div>

        <button className={styles.btnPrimary} style={{ width: '100%', marginTop: 'auto' }} onClick={onIniciar}>
          {mejor > 0 ? 'Reintentar evaluación' : 'Comenzar evaluación'}
        </button>
      </div>
    </div>
  )
}

/* ── Pregunta individual ── */
function Pregunta({ pregunta, index, schema, respuesta, canvasItem, feedback, onSimple, onCanvas }) {
  const cfg = pregunta.canvas_config || {}

  return (
    <div className={styles.question}>
      <div className={styles.questionHead}>
        <span className={styles.questionNum}>{index + 1}</span>
        <div style={{ flex: 1 }}>
          <span className={styles.questionTypeTag}>
            <TipoIcon tipo={pregunta.tipo} /> {TIPO_LABEL[pregunta.tipo] || pregunta.tipo}
          </span>
          <div className={styles.questionText}>{pregunta.enunciado}</div>
        </div>
        <span className={styles.questionPts}>{pregunta.puntaje} pts</span>
      </div>

      {pregunta.tipo === 'opcion_multiple' && (
        <div className={styles.opciones}>
          {(pregunta.opciones || []).map((op, i) => (
            <Opcion
              key={i}
              label={String(op)}
              activa={respuesta === op}
              onClick={() => onSimple(pregunta, op)}
            />
          ))}
        </div>
      )}

      {pregunta.tipo === 'verdadero_falso' && (
        <div className={styles.opciones}>
          {[{ v: true, l: 'Verdadero' }, { v: false, l: 'Falso' }].map((o) => (
            <Opcion
              key={o.l}
              label={o.l}
              activa={respuesta === o.v}
              onClick={() => onSimple(pregunta, o.v)}
            />
          ))}
        </div>
      )}

      {pregunta.tipo === 'canvas_hotspot' && (
        <HotspotCanvas
          schema={schema}
          hotspots={cfg.hotspots || schema?.hotspots || []}
          value={canvasItem?.hotspot_id}
          onChange={(id) => onCanvas(pregunta, { hotspot_id: id })}
          feedback={feedback ? (feedback.correcta ? 'ok' : 'fail') : null}
        />
      )}

      {pregunta.tipo === 'canvas_arrastrar' && (
        <DragDropCanvas
          schema={schema}
          items={cfg.items || schema?.items || []}
          targets={cfg.targets || schema?.targets || []}
          value={canvasItem?.asignaciones || {}}
          onChange={(asig) => onCanvas(pregunta, { asignaciones: asig })}
          feedback={feedback ? (feedback.correcta ? 'ok' : 'fail') : null}
        />
      )}

      {pregunta.tipo === 'canvas_dibujo' && (
        <DibujoCanvas
          value={canvasItem?.strokes || []}
          onChange={(strokes) => onCanvas(pregunta, { strokes })}
        />
      )}

      {feedback && pregunta.tipo !== 'canvas_dibujo' && (
        <div className={`${styles.feedback} ${feedback.correcta ? styles.feedbackOk : styles.feedbackFail}`}>
          {feedback.correcta ? <IconCheck /> : <IconX />}
          {feedback.mensaje || (feedback.correcta ? '¡Correcto!' : 'Revisa tu respuesta')}
        </div>
      )}
    </div>
  )
}

function Opcion({ label, activa, onClick }) {
  return (
    <button type="button" className={`${styles.opcion} ${activa ? styles.opcionActiva : ''}`} onClick={onClick}>
      <span className={`${styles.opcionRadio} ${activa ? styles.opcionRadioActiva : ''}`}>
        {activa && <span className={styles.opcionRadioDot} />}
      </span>
      {label}
    </button>
  )
}

/* ── Resultado ── */
function Resultado({ evaluacion, resultado, preguntas, onReintentar, onVolver }) {
  const pct = Math.round(Number(resultado.puntaje) || 0)
  const revision = resultado.estado === 'pendiente_revision' || resultado.requiere_revision
  const aprobado = resultado.aprobado
  const heroCls = revision ? styles.resultHeroReview : aprobado ? styles.resultHeroPass : styles.resultHeroFail
  const detalle = resultado.detalle_calificacion || []
  const pregById = Object.fromEntries(preguntas.map((p) => [p.id, p]))

  return (
    <div className={styles.resultCard}>
      {/* Columna izquierda: puntuación */}
      <div className={`${styles.resultHero} ${heroCls}`}>
        <div className={styles.resultScoreRing}>
          <span className={styles.resultScore}>{pct}%</span>
          <span className={styles.resultScoreLabel}>{resultado.puntos_obtenidos ?? '—'}/{resultado.puntos_totales ?? '—'} pts</span>
        </div>
        <span className={styles.resultStatusBadge}>
          {revision ? 'En revisión' : aprobado ? '✓ Aprobado' : '✗ No aprobado'}
        </span>
        <h1 className={styles.resultTitle}>
          {revision ? 'Enviado para revisión' : aprobado ? '¡Buen trabajo!' : 'Sigue intentando'}
        </h1>
        <p className={styles.resultSub}>
          {revision
            ? 'Tu instructor revisará las preguntas manuales pronto.'
            : aprobado
            ? `Superaste el ${evaluacion.puntaje_aprobacion}% requerido.`
            : `Necesitabas ${evaluacion.puntaje_aprobacion}% para aprobar.`}
        </p>
      </div>

      {/* Columna derecha: detalle + acciones */}
      <div>
        <div className={styles.resultDetail}>
          <h2 className={styles.resultDetailTitle}>Detalle por pregunta</h2>
          {detalle.map((d, i) => {
            const p = pregById[d.pregunta_id]
            return (
              <div key={i} className={styles.resultQ}>
                {p?.tipo === 'canvas_dibujo' ? (
                  <span className={styles.resultQIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
                    <IconClock />
                  </span>
                ) : (
                  <span className={`${styles.resultQIcon} ${d.correcta ? styles.resultQIconOk : styles.resultQIconFail}`}>
                    {d.correcta ? <IconCheck /> : <IconX />}
                  </span>
                )}
                <div className={styles.resultQBody}>
                  <div className={styles.resultQText}>{p?.enunciado || `Pregunta ${i + 1}`}</div>
                  {p?.tipo === 'canvas_dibujo'
                    ? <div className={styles.resultQFeedback}>Pendiente de revisión manual por el instructor</div>
                    : d.feedback && <div className={styles.resultQFeedback}>{d.feedback}</div>
                  }
                </div>
                <span className={`${styles.resultQScore} ${p?.tipo === 'canvas_dibujo' ? '' : d.correcta ? styles.resultQScoreOk : styles.resultQScoreFail}`}
                  style={p?.tipo === 'canvas_dibujo' ? { color: '#d97706' } : {}}>
                  {d.puntaje}/{d.puntaje_max} pts
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.resultActions}>
          {!aprobado && !revision && (
            <button className={styles.btnPrimary} onClick={onReintentar}>
              <IconRefresh /> Reintentar
            </button>
          )}
          <button className={styles.btnGhost} onClick={onVolver}>
            {aprobado ? 'Volver al curso' : 'Salir'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function esCanvas(tipo) {
  return tipo === 'canvas_hotspot' || tipo === 'canvas_arrastrar' || tipo === 'canvas_dibujo'
}
function vacioCanvas(tipo, item) {
  if (tipo === 'canvas_hotspot') return !item.hotspot_id
  if (tipo === 'canvas_arrastrar') return !item.asignaciones || Object.keys(item.asignaciones).length === 0
  return false
}
