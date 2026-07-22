import { useEffect, useState } from 'react'
import {
  getEvaluaciones, crearEvaluacion, editarEvaluacion, unwrap,
} from '../services/instructorService'
import { IconX, IconPlus, IconTrash, IconQuiz, IconCheck } from './instructorUi'
import CanvasPreguntaEditor, { CANVAS_W, CANVAS_H } from './CanvasPreguntaEditor'
import styles from './Instructor.module.css'

let TEMP = 0
const nuevoTemp = () => ++TEMP

const TIPOS = [
  { v: 'opcion_multiple', l: 'Opción múltiple' },
  { v: 'verdadero_falso', l: 'Verdadero / Falso' },
  { v: 'canvas_hotspot', l: 'Canvas · Hotspot' },
  { v: 'canvas_arrastrar', l: 'Canvas · Arrastrar' },
  { v: 'canvas_dibujo', l: 'Canvas · Dibujo (manual)' },
]

const preguntaVacia = (tipo = 'opcion_multiple') => ({
  tempId: nuevoTemp(),
  tipo,
  enunciado: '',
  puntaje: 10,
  opciones: ['', ''],
  correctaIndex: 0,
  correctaBool: true,
  hotspotId: 'a',
  hotspots: [
    { id: 'a', x: 160, y: 180, r: 36, label: 'Zona A' },
    { id: 'b', x: 320, y: 160, r: 36, label: 'Zona B' },
  ],
  items: [
    { id: 'item1', label: 'Ítem 1', x: 40, y: 40 },
    { id: 'item2', label: 'Ítem 2', x: 40, y: 100 },
  ],
  targets: [
    { id: 't1', label: 'Destino 1', x: 360, y: 40, w: 160, h: 48 },
    { id: 't2', label: 'Destino 2', x: 360, y: 100, w: 160, h: 48 },
  ],
  asignaciones: { item1: 't1', item2: 't2' },
  feedback_ok: 'Correcto',
  feedback_fail: 'Incorrecto, inténtalo de nuevo',
})

function fromApi(p) {
  const base = {
    tempId: nuevoTemp(),
    tipo: p.tipo,
    enunciado: p.enunciado || '',
    puntaje: p.puntaje || 10,
    opciones: ['', ''],
    correctaIndex: 0,
    correctaBool: true,
    hotspotId: 'a',
    hotspots: [
      { id: 'a', x: 160, y: 180, r: 36, label: 'Zona A' },
      { id: 'b', x: 320, y: 160, r: 36, label: 'Zona B' },
    ],
    items: [
      { id: 'item1', label: 'Ítem 1', x: 40, y: 40 },
      { id: 'item2', label: 'Ítem 2', x: 40, y: 100 },
    ],
    targets: [
      { id: 't1', label: 'Destino 1', x: 360, y: 40, w: 160, h: 48 },
      { id: 't2', label: 'Destino 2', x: 360, y: 100, w: 160, h: 48 },
    ],
    asignaciones: {},
    feedback_ok: p.canvas_config?.feedback_ok || 'Correcto',
    feedback_fail: p.canvas_config?.feedback_fail || 'Incorrecto',
  }

  if (p.tipo === 'opcion_multiple') {
    const valor = p.respuesta_correcta?.valor
    const opciones = p.opciones?.length ? p.opciones.map(String) : ['', '']
    return {
      ...base,
      opciones,
      correctaIndex: Math.max(0, opciones.findIndex((o) => String(o) === String(valor))),
    }
  }
  if (p.tipo === 'verdadero_falso') {
    return { ...base, correctaBool: p.respuesta_correcta?.valor === true }
  }
  if (p.tipo === 'canvas_hotspot') {
    const hotspots = p.canvas_config?.hotspots?.length
      ? p.canvas_config.hotspots
      : base.hotspots
    return {
      ...base,
      hotspots,
      hotspotId: p.respuesta_correcta?.hotspot_id || hotspots[0]?.id || 'a',
    }
  }
  if (p.tipo === 'canvas_arrastrar') {
    const items = p.canvas_config?.items?.length ? p.canvas_config.items : base.items
    const targets = p.canvas_config?.targets?.length ? p.canvas_config.targets : base.targets
    return {
      ...base,
      items,
      targets,
      asignaciones: p.respuesta_correcta?.asignaciones || {},
    }
  }
  return base
}

function toApi(p, orden) {
  if (p.tipo === 'opcion_multiple') {
    const opciones = p.opciones.filter((o) => o.trim())
    return {
      enunciado: p.enunciado,
      tipo: 'opcion_multiple',
      orden,
      puntaje: Number(p.puntaje) || 1,
      opciones,
      respuesta_correcta: { valor: p.opciones[p.correctaIndex] },
      canvas_config: {},
    }
  }
  if (p.tipo === 'verdadero_falso') {
    return {
      enunciado: p.enunciado,
      tipo: 'verdadero_falso',
      orden,
      puntaje: Number(p.puntaje) || 1,
      opciones: [true, false],
      respuesta_correcta: { valor: p.correctaBool },
      canvas_config: {},
    }
  }
  if (p.tipo === 'canvas_hotspot') {
    return {
      enunciado: p.enunciado,
      tipo: 'canvas_hotspot',
      orden,
      puntaje: Number(p.puntaje) || 1,
      opciones: [],
      respuesta_correcta: { hotspot_id: p.hotspotId },
      canvas_config: {
        hotspots: p.hotspots,
        feedback_ok: p.feedback_ok,
        feedback_fail: p.feedback_fail,
      },
    }
  }
  if (p.tipo === 'canvas_arrastrar') {
    return {
      enunciado: p.enunciado,
      tipo: 'canvas_arrastrar',
      orden,
      puntaje: Number(p.puntaje) || 1,
      opciones: [],
      respuesta_correcta: { asignaciones: p.asignaciones },
      canvas_config: {
        items: p.items,
        targets: p.targets,
        feedback_ok: p.feedback_ok,
        feedback_fail: p.feedback_fail,
      },
    }
  }
  // canvas_dibujo → calificación manual
  return {
    enunciado: p.enunciado,
    tipo: 'canvas_dibujo',
    orden,
    puntaje: Number(p.puntaje) || 1,
    opciones: [],
    respuesta_correcta: {},
    canvas_config: {
      feedback_ok: p.feedback_ok,
      feedback_fail: p.feedback_fail,
      requiere_revision: true,
    },
  }
}

export default function QuizBuilder({ leccion, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [evaluacionId, setEvaluacionId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [minutos, setMinutos] = useState(10)
  const [aprobacion, setAprobacion] = useState(70)
  const [preguntas, setPreguntas] = useState([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await getEvaluaciones({ leccion: leccion.id })
        const ev = unwrap(data)[0]
        if (!vivo) return
        if (ev) {
          setEvaluacionId(ev.id)
          setTitulo(ev.titulo)
          setMinutos(Math.round((ev.tiempo_limite_seg || 600) / 60))
          setAprobacion(ev.puntaje_aprobacion)
          const list = (ev.preguntas || []).map(fromApi)
          setPreguntas(list.length ? list : [preguntaVacia()])
        } else {
          setTitulo(leccion.titulo || 'Nueva evaluación')
          setPreguntas([preguntaVacia()])
        }
      } catch {
        setError('No se pudo cargar la evaluación.')
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [leccion])

  const setPreg = (tempId, patch) =>
    setPreguntas((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)))

  const addPregunta = (tipo) => setPreguntas((prev) => [...prev, preguntaVacia(tipo)])
  const delPregunta = (tempId) => setPreguntas((prev) => prev.filter((p) => p.tempId !== tempId))

  const setOpcion = (tempId, idx, valor) =>
    setPreguntas((prev) => prev.map((p) => {
      if (p.tempId !== tempId) return p
      const opciones = [...p.opciones]
      opciones[idx] = valor
      return { ...p, opciones }
    }))
  const addOpcion = (tempId) =>
    setPreguntas((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, opciones: [...p.opciones, ''] } : p)))
  const delOpcion = (tempId, idx) =>
    setPreguntas((prev) => prev.map((p) => {
      if (p.tempId !== tempId) return p
      const opciones = p.opciones.filter((_, i) => i !== idx)
      return { ...p, opciones, correctaIndex: Math.min(p.correctaIndex, opciones.length - 1) }
    }))

  const validar = () => {
    if (!titulo.trim()) return 'La evaluación necesita un título.'
    if (preguntas.length === 0) return 'Agrega al menos una pregunta.'
    for (const p of preguntas) {
      if (!p.enunciado.trim()) return 'Todas las preguntas necesitan enunciado.'
      if (p.tipo === 'opcion_multiple') {
        const validas = p.opciones.filter((o) => o.trim())
        if (validas.length < 2) return 'Las de opción múltiple necesitan ≥ 2 opciones.'
        if (!p.opciones[p.correctaIndex]?.trim()) return 'Marca una opción correcta válida.'
      }
      if (p.tipo === 'canvas_hotspot') {
        if (!p.hotspots?.length) return 'Hotspot: define al menos una zona.'
        if (!p.hotspots.some((h) => h.id === p.hotspotId)) return 'Hotspot: elige la zona correcta.'
      }
      if (p.tipo === 'canvas_arrastrar') {
        if (!p.items?.length || !p.targets?.length) return 'Arrastrar: define ítems y destinos.'
      }
    }
    return ''
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    try {
      const preguntasPayload = preguntas.map((p, i) => toApi(p, i + 1))
      const payload = {
        leccion: leccion.id,
        titulo,
        tiempo_limite_seg: Math.max(60, Number(minutos) * 60),
        puntaje_aprobacion: Number(aprobacion),
        canvas_schema: {
          width: CANVAS_W,
          height: CANVAS_H,
          background: '#0f172a',
        },
        preguntas: preguntasPayload,
      }
      if (evaluacionId) await editarEvaluacion(evaluacionId, payload)
      else await crearEvaluacion(payload)
      onSaved()
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : Object.values(d || {}).flat().join(' ') || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const totalPuntos = preguntas.reduce((s, p) => s + (Number(p.puntaje) || 0), 0)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}><IconQuiz /> Constructor de evaluación</h2>
          <button className={styles.closeBtn} onClick={onClose}><IconX /></button>
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.stateWrap}><div className={styles.spinner} /></div>
          ) : (
            <>
              {error && <div className={styles.apiError}>{error}</div>}

              <div className={styles.field}>
                <label className={styles.label}>Título de la evaluación</label>
                <input className={styles.input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Tiempo límite (min)</label>
                  <input type="number" min="1" className={styles.input} value={minutos}
                    onChange={(e) => setMinutos(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>% para aprobar</label>
                  <input type="number" min="0" max="100" className={styles.input} value={aprobacion}
                    onChange={(e) => setAprobacion(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className={styles.label}>Preguntas ({preguntas.length}) · {totalPuntos} pts</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {TIPOS.map((t) => (
                    <button key={t.v} type="button" className={styles.btnGhost} onClick={() => addPregunta(t.v)}>
                      <IconPlus /> {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {preguntas.map((p, idx) => (
                <PreguntaEditor
                  key={p.tempId}
                  pregunta={p}
                  index={idx}
                  onChange={(patch) => setPreg(p.tempId, patch)}
                  onDelete={() => delPregunta(p.tempId)}
                  onOpcion={(i, v) => setOpcion(p.tempId, i, v)}
                  onAddOpcion={() => addOpcion(p.tempId)}
                  onDelOpcion={(i) => delOpcion(p.tempId, i)}
                  canDelete={preguntas.length > 1}
                />
              ))}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          <button className={styles.btnPrimary} onClick={guardar} disabled={saving || loading}>
            {saving ? 'Guardando…' : (<><IconCheck /> Guardar evaluación</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreguntaEditor({ pregunta: p, index, onChange, onDelete, onOpcion, onAddOpcion, onDelOpcion, canDelete }) {
  return (
    <div className={styles.moduloCard} style={{ marginBottom: '0.85rem' }}>
      <div className={styles.moduloHead}>
        <span className={styles.moduloNum}>{index + 1}</span>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 90px', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo de pregunta</span>
            <select className={styles.select} style={{ width: '100%' }}
              value={p.tipo} onChange={(e) => onChange({ tipo: e.target.value })}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Puntos</span>
            <input type="number" min="1" className={styles.input} style={{ width: '100%', height: 34 }}
              value={p.puntaje} onChange={(e) => onChange({ puntaje: e.target.value })} />
          </div>
        </div>
        {canDelete && (
          <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={onDelete} title="Eliminar"><IconTrash /></button>
        )}
      </div>

      <div style={{ padding: '1rem 1.15rem' }}>
        <div className={styles.field}>
          <label className={styles.label}>Enunciado</label>
          <input className={styles.input} placeholder="Escribe la pregunta…"
            value={p.enunciado} onChange={(e) => onChange({ enunciado: e.target.value })} />
        </div>

        {p.tipo === 'opcion_multiple' && (
          <div className={styles.field}>
            <label className={styles.label}>Opciones (marca la correcta)</label>
            {p.opciones.map((op, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="radio" name={`correcta-${p.tempId}`} checked={p.correctaIndex === i}
                  onChange={() => onChange({ correctaIndex: i })} style={{ width: 18, height: 18, accentColor: '#16a34a', flexShrink: 0 }} />
                <input className={styles.input} placeholder={`Opción ${i + 1}`} value={op}
                  onChange={(e) => onOpcion(i, e.target.value)} />
                {p.opciones.length > 2 && (
                  <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={() => onDelOpcion(i)}><IconTrash /></button>
                )}
              </div>
            ))}
            <button className={styles.btnGhost} onClick={onAddOpcion} style={{ width: 'fit-content' }}>
              <IconPlus /> Añadir opción
            </button>
          </div>
        )}

        {p.tipo === 'verdadero_falso' && (
          <div className={styles.field}>
            <label className={styles.label}>Respuesta correcta</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={`${styles.tipoChip} ${p.correctaBool ? styles.tipoChipActive : ''}`}
                onClick={() => onChange({ correctaBool: true })}>Verdadero</button>
              <button type="button" className={`${styles.tipoChip} ${!p.correctaBool ? styles.tipoChipActive : ''}`}
                onClick={() => onChange({ correctaBool: false })}>Falso</button>
            </div>
          </div>
        )}

        {p.tipo === 'canvas_hotspot' && (
          <div className={styles.field}>
            <label className={styles.label}>Zonas seleccionables</label>
            <CanvasPreguntaEditor
              modo="canvas_hotspot"
              hotspots={p.hotspots}
              correctaHotspotId={p.hotspotId}
              onHotspotsChange={(hotspots) => onChange({ hotspots })}
              onCorrectaHotspotChange={(hotspotId) => onChange({ hotspotId })}
            />
            <div className={styles.fieldRow} style={{ marginTop: '0.75rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Feedback correcto</label>
                <input className={styles.input} value={p.feedback_ok}
                  onChange={(e) => onChange({ feedback_ok: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Feedback incorrecto</label>
                <input className={styles.input} value={p.feedback_fail}
                  onChange={(e) => onChange({ feedback_fail: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {p.tipo === 'canvas_arrastrar' && (
          <div className={styles.field}>
            <label className={styles.label}>Elementos y zonas objetivo</label>
            <CanvasPreguntaEditor
              modo="canvas_arrastrar"
              items={p.items}
              targets={p.targets}
              asignaciones={p.asignaciones}
              onItemsChange={(items) => onChange({ items })}
              onTargetsChange={(targets) => onChange({ targets })}
              onAsignacionesChange={(asignaciones) => onChange({ asignaciones })}
            />
          </div>
        )}

        {p.tipo === 'canvas_dibujo' && (
          <div className={styles.field}>
            <p className={styles.hint}>
              El estudiante dibuja en el lienzo. Queda en <strong>pendiente de revisión</strong> para calificación manual.
            </p>
            <label className={styles.label}>Feedback al revisar</label>
            <input className={styles.input} value={p.feedback_ok}
              onChange={(e) => onChange({ feedback_ok: e.target.value })} placeholder="Comentario sugerido" />
          </div>
        )}
      </div>
    </div>
  )
}

