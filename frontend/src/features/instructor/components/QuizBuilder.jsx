import { useEffect, useState } from 'react'
import {
  getEvaluaciones, crearEvaluacion, editarEvaluacion, unwrap,
} from '../services/instructorService'
import { IconX, IconPlus, IconTrash, IconQuiz, IconCheck } from './instructorUi'
import styles from './Instructor.module.css'

let TEMP = 0
const nuevoTemp = () => ++TEMP

const preguntaVacia = () => ({
  tempId: nuevoTemp(),
  tipo: 'opcion_multiple',
  enunciado: '',
  puntaje: 10,
  opciones: ['', ''],
  correctaIndex: 0,
  correctaBool: true,
})

export default function QuizBuilder({ leccion, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [evaluacionId, setEvaluacionId] = useState(null)

  const [titulo, setTitulo] = useState('')
  const [minutos, setMinutos] = useState(10)
  const [aprobacion, setAprobacion] = useState(70)
  const [preguntas, setPreguntas] = useState([])
  const [canvasPreservadas, setCanvasPreservadas] = useState([]) // preguntas Canvas intactas

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
          const simples = []
          const canvas = []
          ;(ev.preguntas || []).forEach((p) => {
            if (p.tipo === 'opcion_multiple') {
              const valor = p.respuesta_correcta?.valor
              simples.push({
                tempId: nuevoTemp(), tipo: 'opcion_multiple', enunciado: p.enunciado,
                puntaje: p.puntaje, opciones: p.opciones?.length ? p.opciones.map(String) : ['', ''],
                correctaIndex: Math.max(0, (p.opciones || []).findIndex((o) => String(o) === String(valor))),
                correctaBool: true,
              })
            } else if (p.tipo === 'verdadero_falso') {
              simples.push({
                tempId: nuevoTemp(), tipo: 'verdadero_falso', enunciado: p.enunciado,
                puntaje: p.puntaje, opciones: ['', ''], correctaIndex: 0,
                correctaBool: p.respuesta_correcta?.valor === true,
              })
            } else {
              canvas.push({ ...p, orden: p.orden })
            }
          })
          setPreguntas(simples.length ? simples : [preguntaVacia()])
          setCanvasPreservadas(canvas)
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

  const addPregunta = () => setPreguntas((prev) => [...prev, preguntaVacia()])
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
        if (validas.length < 2) return 'Las preguntas de opción múltiple necesitan al menos 2 opciones.'
        if (!p.opciones[p.correctaIndex]?.trim()) return 'Marca una opción correcta válida.'
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
      const preguntasPayload = []
      let orden = 1
      preguntas.forEach((p) => {
        if (p.tipo === 'opcion_multiple') {
          const opciones = p.opciones.filter((o) => o.trim())
          preguntasPayload.push({
            enunciado: p.enunciado, tipo: 'opcion_multiple', orden: orden++,
            puntaje: Number(p.puntaje) || 1, opciones,
            respuesta_correcta: { valor: p.opciones[p.correctaIndex] }, canvas_config: {},
          })
        } else {
          preguntasPayload.push({
            enunciado: p.enunciado, tipo: 'verdadero_falso', orden: orden++,
            puntaje: Number(p.puntaje) || 1, opciones: [true, false],
            respuesta_correcta: { valor: p.correctaBool }, canvas_config: {},
          })
        }
      })
      // Preserva preguntas Canvas existentes
      canvasPreservadas.forEach((p) => {
        preguntasPayload.push({
          enunciado: p.enunciado, tipo: p.tipo, orden: orden++,
          puntaje: p.puntaje, opciones: p.opciones || [],
          respuesta_correcta: p.respuesta_correcta || {}, canvas_config: p.canvas_config || {},
        })
      })

      const payload = {
        leccion: leccion.id,
        titulo,
        tiempo_limite_seg: Math.max(60, Number(minutos) * 60),
        puntaje_aprobacion: Number(aprobacion),
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
    + canvasPreservadas.reduce((s, p) => s + (p.puntaje || 0), 0)

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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 0.75rem' }}>
                <span className={styles.label}>Preguntas ({preguntas.length + canvasPreservadas.length})</span>
                <span className={styles.hint}>Total: {totalPuntos} pts</span>
              </div>

              {preguntas.map((p, idx) => (
                <PreguntaEditor
                  key={p.tempId} pregunta={p} index={idx}
                  onChange={(patch) => setPreg(p.tempId, patch)}
                  onDelete={() => delPregunta(p.tempId)}
                  onOpcion={(i, v) => setOpcion(p.tempId, i, v)}
                  onAddOpcion={() => addOpcion(p.tempId)}
                  onDelOpcion={(i) => delOpcion(p.tempId, i)}
                  canDelete={preguntas.length > 1}
                />
              ))}

              {canvasPreservadas.map((p, i) => (
                <div key={`c${i}`} className={styles.moduloCard} style={{ marginBottom: '0.75rem' }}>
                  <div className={styles.leccionRow}>
                    <span className={styles.leccionIcon}><IconQuiz /></span>
                    <div className={styles.leccionInfo}>
                      <div className={styles.leccionTitulo}>{p.enunciado}</div>
                      <div className={styles.leccionSub}>
                        <span className={styles.leccionTag}>Canvas · {p.tipo === 'canvas_hotspot' ? 'Seleccionar' : 'Arrastrar'}</span>
                        <span>{p.puntaje} pts · se conserva</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button className={styles.addModuloBtn} onClick={addPregunta} style={{ marginTop: '0.5rem' }}>
                <IconPlus /> Agregar pregunta
              </button>
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
        <select className={styles.select} style={{ width: 'auto', flex: 1, maxWidth: 220, height: 34 }}
          value={p.tipo} onChange={(e) => onChange({ tipo: e.target.value })}>
          <option value="opcion_multiple">Opción múltiple</option>
          <option value="verdadero_falso">Verdadero / Falso</option>
        </select>
        <input type="number" min="1" className={styles.input} style={{ width: 90, height: 34 }}
          value={p.puntaje} onChange={(e) => onChange({ puntaje: e.target.value })} title="Puntaje" />
        {canDelete && (
          <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={onDelete} title="Eliminar pregunta"><IconTrash /></button>
        )}
      </div>

      <div style={{ padding: '1rem 1.15rem' }}>
        <div className={styles.field}>
          <label className={styles.label}>Enunciado</label>
          <input className={styles.input} placeholder="Escribe la pregunta…"
            value={p.enunciado} onChange={(e) => onChange({ enunciado: e.target.value })} />
        </div>

        {p.tipo === 'opcion_multiple' ? (
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
        ) : (
          <div className={styles.field}>
            <label className={styles.label}>Respuesta correcta</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={`${styles.tipoChip} ${p.correctaBool ? styles.tipoChipActive : ''}`}
                onClick={() => onChange({ correctaBool: true })}>Verdadero</button>
              <button className={`${styles.tipoChip} ${!p.correctaBool ? styles.tipoChipActive : ''}`}
                onClick={() => onChange({ correctaBool: false })}>Falso</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
