import { useEffect, useState } from 'react'
import {
  getIntentos, calificarIntento, unwrap,
} from '../services/instructorService'
import {
  useToast, IconX, IconCheck, IconClipboard, IconClock,
} from './instructorUi'
import styles from './Instructor.module.css'

const iniciales = (n) => (n?.[0] || 'U').toUpperCase()

const ESTADO_INTENTO = {
  finalizado: { label: 'Calificado auto', color: '#6b7280', bg: '#f3f4f6' },
  pendiente_revision: { label: 'Pendiente', color: '#d97706', bg: '#fffbeb' },
  revisado: { label: 'Revisado', color: '#16a34a', bg: '#f0fdf4' },
}

export default function InstructorCalificaciones() {
  const [intentos, setIntentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [soloPendientes, setSoloPendientes] = useState(false)
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Calificaciones</h1>
            {!loading && <span className={styles.countBadge}>{intentos.length}</span>}
          </div>
          <p className={styles.pageDesc}>Revisa y califica los intentos de evaluación de tus estudiantes</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
          Solo pendientes de revisión
        </label>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : intentos.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconClipboard /></div>
          <p className={styles.stateTitle}>{soloPendientes ? 'Nada pendiente por revisar' : 'Aún no hay intentos'}</p>
          <p className={styles.stateDesc}>Cuando tus estudiantes resuelvan evaluaciones, aparecerán aquí.</p>
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
                    <td>{it.evaluacion_titulo}</td>
                    <td>
                      <span className={`${styles.scorePill} ${it.aprobado ? styles.scoreOk : styles.scoreFail}`}>
                        {Math.round(Number(it.puntaje))}%
                      </span>
                    </td>
                    <td>
                      <span className={styles.estadoBadge} style={{ background: est.bg, color: est.color }}>{est.label}</span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                      {new Date(it.finalizado_en || it.iniciado_en).toLocaleDateString('es-PE')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.btnGhost} onClick={() => setGrading(it)}>Revisar</button>
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

function GradeModal({ intento, onClose, onSaved, notify }) {
  const [puntaje, setPuntaje] = useState(Math.round(Number(intento.puntaje)))
  const [aprobado, setAprobado] = useState(intento.aprobado)
  const [feedback, setFeedback] = useState(intento.feedback_instructor || '')
  const [saving, setSaving] = useState(false)

  const detalle = intento.detalle_calificacion || []

  const guardar = async () => {
    setSaving(true)
    try {
      const { data } = await calificarIntento(intento.id, {
        puntaje: Number(puntaje),
        aprobado,
        feedback_instructor: feedback,
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

          {/* Detalle auto-calificación */}
          {detalle.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Auto-calificación por pregunta</label>
              <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                {detalle.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderBottom: i < detalle.length - 1 ? '1px solid #f6f7f9' : 'none' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: d.correcta ? '#16a34a' : '#dc2626',
                    }}>
                      {d.correcta ? <IconCheck /> : <IconX />}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.82rem', color: '#6b7280' }}>{d.feedback || `Pregunta ${i + 1}`}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: d.correcta ? '#16a34a' : '#9ca3af' }}>
                      {d.puntaje}/{d.puntaje_max} pts
                    </span>
                  </div>
                ))}
              </div>
              <span className={styles.hint}>Puntaje automático: {Math.round(Number(intento.puntaje_automatico))}%</span>
            </div>
          )}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Puntaje final (%)</label>
              <input type="number" min="0" max="100" className={styles.input}
                value={puntaje} onChange={(e) => setPuntaje(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>¿Aprobado?</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`${styles.tipoChip} ${aprobado ? styles.tipoChipActive : ''}`} onClick={() => setAprobado(true)}>Sí</button>
                <button className={`${styles.tipoChip} ${!aprobado ? styles.tipoChipActive : ''}`} onClick={() => setAprobado(false)}>No</button>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Retroalimentación para el estudiante</label>
            <textarea className={styles.textarea} placeholder="Comentarios sobre su desempeño…"
              value={feedback} onChange={(e) => setFeedback(e.target.value)} />
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
