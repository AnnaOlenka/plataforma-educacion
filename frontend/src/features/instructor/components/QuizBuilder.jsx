import { useEffect, useState } from 'react'
import {
  getEvaluaciones, crearEvaluacion, editarEvaluacion, unwrap,
} from '../services/instructorService'
import { IconX, IconPlus, IconTrash, IconQuiz, IconCheck } from './instructorUi'
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
          width: 640,
          height: 360,
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
        <select className={styles.select} style={{ width: 'auto', flex: 1, maxWidth: 240, height: 34 }}
          value={p.tipo} onChange={(e) => onChange({ tipo: e.target.value })}>
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <input type="number" min="1" className={styles.input} style={{ width: 90, height: 34 }}
          value={p.puntaje} onChange={(e) => onChange({ puntaje: e.target.value })} title="Puntaje" />
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
          <HotspotEditor pregunta={p} onChange={onChange} />
        )}

        {p.tipo === 'canvas_arrastrar' && (
          <ArrastrarEditor pregunta={p} onChange={onChange} />
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

function HotspotEditor({ pregunta: p, onChange }) {
  const updateHs = (idx, patch) => {
    const hotspots = p.hotspots.map((h, i) => (i === idx ? { ...h, ...patch } : h))
    onChange({ hotspots })
  }
  const addHs = () => {
    const id = String.fromCharCode(97 + p.hotspots.length)
    onChange({
      hotspots: [...p.hotspots, { id, x: 100 + p.hotspots.length * 80, y: 180, r: 36, label: `Zona ${id.toUpperCase()}` }],
    })
  }
  const delHs = (idx) => {
    const hotspots = p.hotspots.filter((_, i) => i !== idx)
    onChange({
      hotspots,
      hotspotId: hotspots.some((h) => h.id === p.hotspotId) ? p.hotspotId : hotspots[0]?.id,
    })
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>Zonas clicables (x, y, radio)</label>
      {p.hotspots.map((h, i) => (
        <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px auto auto', gap: '0.4rem', marginBottom: '0.45rem', alignItems: 'center' }}>
          <input className={styles.input} value={h.label} onChange={(e) => updateHs(i, { label: e.target.value })} placeholder="Etiqueta" />
          <input type="number" className={styles.input} value={h.x} onChange={(e) => updateHs(i, { x: Number(e.target.value) })} title="X" />
          <input type="number" className={styles.input} value={h.y} onChange={(e) => updateHs(i, { y: Number(e.target.value) })} title="Y" />
          <input type="number" className={styles.input} value={h.r} onChange={(e) => updateHs(i, { r: Number(e.target.value) })} title="Radio" />
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <input type="radio" name={`hs-${p.tempId}`} checked={p.hotspotId === h.id}
              onChange={() => onChange({ hotspotId: h.id })} /> OK
          </label>
          {p.hotspots.length > 1 && (
            <button type="button" className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={() => delHs(i)}><IconTrash /></button>
          )}
        </div>
      ))}
      <button type="button" className={styles.btnGhost} onClick={addHs} style={{ width: 'fit-content' }}>
        <IconPlus /> Zona
      </button>
      <div className={styles.fieldRow} style={{ marginTop: '0.75rem' }}>
        <div className={styles.field}>
          <label className={styles.label}>Feedback correcto</label>
          <input className={styles.input} value={p.feedback_ok} onChange={(e) => onChange({ feedback_ok: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Feedback incorrecto</label>
          <input className={styles.input} value={p.feedback_fail} onChange={(e) => onChange({ feedback_fail: e.target.value })} />
        </div>
      </div>
    </div>
  )
}

function ArrastrarEditor({ pregunta: p, onChange }) {
  const updateItem = (idx, patch) => {
    const items = p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    onChange({ items })
  }
  const updateTarget = (idx, patch) => {
    const targets = p.targets.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    onChange({ targets })
  }
  const setAsig = (itemId, targetId) => {
    onChange({ asignaciones: { ...p.asignaciones, [itemId]: targetId } })
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>Ítems arrastrables</label>
      {p.items.map((it, i) => (
        <div key={it.id} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <input className={styles.input} value={it.label}
            onChange={(e) => updateItem(i, { label: e.target.value })} />
          <select className={styles.select} style={{ width: 160 }}
            value={p.asignaciones[it.id] || ''}
            onChange={(e) => setAsig(it.id, e.target.value)}>
            <option value="">→ destino…</option>
            {p.targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      ))}
      <button type="button" className={styles.btnGhost} style={{ width: 'fit-content', marginBottom: '0.75rem' }}
        onClick={() => {
          const id = `item${p.items.length + 1}`
          onChange({ items: [...p.items, { id, label: `Ítem ${p.items.length + 1}`, x: 40, y: 40 + p.items.length * 50 }] })
        }}>
        <IconPlus /> Ítem
      </button>

      <label className={styles.label}>Destinos</label>
      {p.targets.map((t, i) => (
        <div key={t.id} style={{ marginBottom: '0.4rem' }}>
          <input className={styles.input} value={t.label}
            onChange={(e) => updateTarget(i, { label: e.target.value })} />
        </div>
      ))}
      <button type="button" className={styles.btnGhost} style={{ width: 'fit-content' }}
        onClick={() => {
          const id = `t${p.targets.length + 1}`
          onChange({
            targets: [...p.targets, { id, label: `Destino ${p.targets.length + 1}`, x: 360, y: 40 + p.targets.length * 60, w: 160, h: 48 }],
          })
        }}>
        <IconPlus /> Destino
      </button>
    </div>
  )
}
