import { useEffect, useState } from 'react'
import {
  getIntentos, getIntento, calificarIntento, unwrap,
} from '../services/instructorService'
import {
  useToast, IconX, IconCheck, IconClipboard,
} from './instructorUi'
import styles from './Instructor.module.css'

const iniciales = (n) => (n?.[0] || 'U').toUpperCase()

const ESTADO_INTENTO = {
  finalizado: { label: 'Calificado auto', color: '#6b7280', bg: '#f3f4f6' },
  pendiente_revision: { label: 'Pendiente', color: '#d97706', bg: '#fffbeb' },
  revisado: { label: 'Revisado', color: '#16a34a', bg: '#f0fdf4' },
  en_progreso: { label: 'En progreso', color: '#2563eb', bg: '#eff6ff' },
}

export default function InstructorCalificaciones() {
  const [intentos, setIntentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [grading, setGrading] = useState(null)
  const { toast, notify } = useToast()

  const cargar = async () => {
    setLoading(true)
    try {
      const params = { page_size: 50 }
      if (soloPendientes) params.pendientes = 1
      const { data } = await getIntentos(params)
      setIntentos(unwrap(data))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [soloPendientes]) // eslint-disable-line react-hooks/exhaustive-deps

  const abrirRevisar = async (it) => {
    try {
      const { data } = await getIntento(it.id)
      setGrading(data)
    } catch {
      setGrading(it)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Calificaciones</h1>
            {!loading && <span className={styles.countBadge}>{intentos.length}</span>}
          </div>
          <p className={styles.pageDesc}>
            Revisa intentos Canvas (dibujo) y ajusta calificaciones manualmente
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#6366f1' }}
          />
          Solo pendientes de revisión
        </label>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : intentos.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconClipboard /></div>
          <p className={styles.stateTitle}>
            {soloPendientes ? 'Nada pendiente por revisar' : 'Aún no hay intentos'}
          </p>
          <p className={styles.stateDesc}>
            Cuando tus estudiantes resuelvan evaluaciones (sobre todo dibujo), aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Evaluación</th>
                <th>Puntaje</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {intentos.map((it) => {
                const est = ESTADO_INTENTO[it.estado] || ESTADO_INTENTO.finalizado
                return (
                  <tr key={it.id}>
                    <td>
                      <div className={styles.tdStudent}>
                        <span className={styles.miniAvatar}>{iniciales(it.estudiante_nombre)}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{it.estudiante_nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{it.estudiante_username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{it.evaluacion_titulo}</div>
                      {it.curso_slug && (
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{it.curso_slug}</div>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.scorePill} ${it.aprobado ? styles.scoreOk : styles.scoreFail}`}>
                        {Math.round(Number(it.puntaje || 0))}%
                      </span>
                    </td>
                    <td>
                      <span className={styles.estadoBadge} style={{ background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                      {new Date(it.finalizado_en || it.iniciado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.btnGhost} onClick={() => abrirRevisar(it)}>Revisar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {grading && (
        <GradeModal
          intento={grading}
          onClose={() => setGrading(null)}
          onSaved={(actualizado) => {
            setIntentos((prev) => prev.map((i) => (i.id === actualizado.id ? actualizado : i)))
            setGrading(null)
            notify('Calificación guardada')
            if (soloPendientes) cargar()
          }}
          notify={notify}
        />
      )}

      {toast}
    </div>
  )
}

const esManual = (d) => d.tipo === 'canvas_dibujo' || d.detalle?.tipo === 'canvas_dibujo'

function GradeModal({ intento, onClose, onSaved, notify }) {
  const detalle = intento.detalle_calificacion || []
  const yaRevisado = intento.estado === 'revisado'

  const puntosTotales = detalle.reduce((s, d) => s + (d.puntaje_max || 0), 0)
  const puntosAutoSum = detalle.filter((d) => !esManual(d)).reduce((s, d) => s + (d.puntaje || 0), 0)

  // Puntos otorgados a cada pregunta de dibujo (calificación manual explícita,
  // no una adivinanza sobre el % final). Si ya se revisó antes, reconstruye lo
  // guardado; si es la primera revisión, arranca en 0 — nunca se auto-otorgan.
  const [manualPts, setManualPts] = useState(() => {
    const init = {}
    detalle.forEach((d, i) => {
      if (!esManual(d)) return
      init[i] = yaRevisado
        ? Math.max(0, Math.round((Number(intento.puntaje) / 100) * puntosTotales) - puntosAutoSum)
        : 0
    })
    return init
  })
  const [aprobado, setAprobado] = useState(!!intento.aprobado)
  const [feedback, setFeedback] = useState(intento.feedback_instructor || '')
  const [saving, setSaving] = useState(false)

  const puntosManualSum = Object.values(manualPts).reduce((s, v) => s + (Number(v) || 0), 0)
  const puntajeSugerido = puntosTotales ? Math.round(((puntosAutoSum + puntosManualSum) / puntosTotales) * 100) : 0
  const [puntaje, setPuntaje] = useState(puntajeSugerido)
  // Recalcula el % sugerido cada vez que el instructor ajusta los puntos de dibujo.
  useEffect(() => { setPuntaje(puntajeSugerido) }, [puntosManualSum]) // eslint-disable-line react-hooks/exhaustive-deps

  const respuestas = intento.respuestas || {}
  const canvas = intento.canvas_payload || {}

  const setPuntosManual = (idx, valor, max) => {
    const num = Math.max(0, Math.min(Number(valor) || 0, max))
    setManualPts((prev) => ({ ...prev, [idx]: num }))
  }

  const guardar = async () => {
    setSaving(true)
    try {
      const detalleActualizado = detalle.map((d, i) =>
        esManual(d)
          ? { ...d, puntaje: Number(manualPts[i] || 0), correcta: Number(manualPts[i] || 0) >= (d.puntaje_max || 0) }
          : d
      )
      const { data } = await calificarIntento(intento.id, {
        puntaje: Number(puntaje),
        aprobado,
        feedback_instructor: feedback,
        detalle_calificacion: detalleActualizado,
      })
      onSaved(data)
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo calificar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Calificar intento</h2>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.tdStudent} style={{ marginBottom: '1rem' }}>
            <span className={styles.miniAvatar}>{(intento.estudiante_nombre?.[0] || 'U').toUpperCase()}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{intento.estudiante_nombre}</div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{intento.evaluacion_titulo}</div>
            </div>
          </div>

          {detalle.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Calificación por pregunta</label>
              <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                {detalle.map((d, i) => {
                  const manual = esManual(d)
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.6rem 0.85rem',
                        borderBottom: i < detalle.length - 1 ? '1px solid #f6f7f9' : 'none',
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: manual ? '#d97706' : d.correcta ? '#16a34a' : '#dc2626',
                      }}>
                        {manual ? <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>✎</span> : d.correcta ? <IconCheck /> : <IconX />}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: '#6b7280' }}>
                        {manual ? 'Dibujo — califica según lo dibujado abajo' : (d.feedback || `Pregunta ${i + 1}`)}
                      </span>
                      {manual ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            min="0"
                            max={d.puntaje_max}
                            value={manualPts[i] ?? 0}
                            onChange={(e) => setPuntosManual(i, e.target.value, d.puntaje_max)}
                            className={styles.input}
                            style={{ width: 60, height: 30, padding: '0 0.4rem', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>/{d.puntaje_max} pts</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: d.correcta ? '#16a34a' : '#9ca3af' }}>
                          {d.puntaje}/{d.puntaje_max} pts
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              <span className={styles.hint}>
                Auto-calificado: {puntosAutoSum} pts · Dibujo (asignado arriba): {puntosManualSum} pts · % sugerido: {puntajeSugerido}%
              </span>
            </div>
          )}

          {(Object.keys(respuestas).length > 0 || Object.keys(canvas).length > 0) && (
            <div className={styles.field}>
              <label className={styles.label}>Respuestas / Canvas del estudiante</label>
              <CanvasPreview respuestas={respuestas} canvas={canvas} />
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Puntaje final (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className={styles.input}
                value={puntaje}
                onChange={(e) => setPuntaje(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>¿Aprobado?</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className={`${styles.tipoChip} ${aprobado ? styles.tipoChipActive : ''}`} onClick={() => setAprobado(true)}>Sí</button>
                <button type="button" className={`${styles.tipoChip} ${!aprobado ? styles.tipoChipActive : ''}`} onClick={() => setAprobado(false)}>No</button>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Retroalimentación para el estudiante</label>
            <textarea
              className={styles.textarea}
              placeholder="Comentarios sobre su desempeño…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          <button className={styles.btnPrimary} onClick={guardar} disabled={saving}>
            {saving ? 'Guardando…' : (<><IconCheck /> Guardar calificación</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

const TIPO_META = {
  hotspot:     { label: 'Hotspot',     bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6' },
  asignacion:  { label: 'Asignación',  bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
  dibujo:      { label: 'Dibujo',      bg: '#fdf4ff', color: '#9333ea', dot: '#a855f7' },
  simple:      { label: 'Respuesta',   bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
}

function RespuestaCanvasItem({ pregId, valor, idx }) {
  if (valor === null || valor === undefined) return null

  let tipo = 'simple'
  let contenido = null

  if (typeof valor === 'object') {
    const strokes = valor.strokes || valor.paths || valor.dibujo
    const hotspot = valor.hotspot_id || valor.selected_hotspot
    const asignaciones = valor.asignaciones

    if (Array.isArray(strokes) && strokes.length > 0) {
      tipo = 'dibujo'
      contenido = <StrokeCanvas strokes={strokes} />
    } else if (valor.dataUrl) {
      tipo = 'dibujo'
      contenido = <img src={valor.dataUrl} alt="Dibujo" style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid #e5e7eb', marginTop: 6 }} />
    } else if (hotspot) {
      tipo = 'hotspot'
      contenido = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.82rem', fontWeight: 700 }}>
          Zona {String(hotspot).toUpperCase()}
        </span>
      )
    } else if (asignaciones && typeof asignaciones === 'object') {
      tipo = 'asignacion'
      contenido = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 4 }}>
          {Object.entries(asignaciones).map(([k, v]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '0.18rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}>
              {k}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>→</span>
              {String(v)}
            </span>
          ))}
        </div>
      )
    } else {
      contenido = <span style={{ fontSize: '0.8rem', color: '#374151' }}>{JSON.stringify(valor)}</span>
    }
  } else {
    const bool = typeof valor === 'boolean'
    const text = bool ? (valor ? 'Verdadero' : 'Falso') : String(valor)
    const isTrue = valor === true
    contenido = (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bool ? (isTrue ? '#dcfce7' : '#fee2e2') : '#f3f4f6',
        color: bool ? (isTrue ? '#15803d' : '#b91c1c') : '#374151',
        borderRadius: 20, padding: '0.2rem 0.8rem', fontSize: '0.82rem', fontWeight: 700,
      }}>
        {bool && <span style={{ fontSize: '0.7rem' }}>{isTrue ? '✓' : '✗'}</span>}
        {text}
      </span>
    )
  }

  const meta = TIPO_META[tipo]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: '#fff', border: '1px solid #f3f4f6',
      borderRadius: 10, padding: '0.65rem 0.85rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: '#f3f4f6', color: '#6b7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700,
        }}>{idx + 1}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>Pregunta {pregId}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: meta.bg, color: meta.color, borderRadius: 20, padding: '0.1rem 0.55rem', fontWeight: 600 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: meta.dot, marginRight: 4, verticalAlign: 'middle' }} />
          {meta.label}
        </span>
      </div>
      <div style={{ paddingLeft: 28 }}>{contenido}</div>
    </div>
  )
}

function CanvasPreview({ respuestas, canvas }) {
  const allIds = [...new Set([...Object.keys(respuestas), ...Object.keys(canvas)])]
    .sort((a, b) => Number(a) - Number(b))

  if (allIds.length === 0) {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.85rem', background: '#f9fafb' }}>
        <p className={styles.hint}>Sin respuestas registradas.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {allIds.map((id, idx) => {
        const valor = canvas[id] !== undefined ? canvas[id] : respuestas[id]
        return <RespuestaCanvasItem key={id} pregId={id} valor={valor} idx={idx} />
      })}
    </div>
  )
}

function StrokeCanvas({ strokes }) {
  const w = 480
  const h = 270
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      style={{ maxWidth: w, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
    >
      {strokes.map((s, i) => {
        if (s.points && Array.isArray(s.points)) {
          const d = s.points.map((pt, j) => `${j ? 'L' : 'M'} ${pt.x ?? pt[0]} ${pt.y ?? pt[1]}`).join(' ')
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={s.color || '#111827'}
              strokeWidth={s.width || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }
        if (s.path) {
          return <path key={i} d={s.path} fill="none" stroke={s.color || '#111827'} strokeWidth={s.width || 2} />
        }
        return null
      })}
    </svg>
  )
}
