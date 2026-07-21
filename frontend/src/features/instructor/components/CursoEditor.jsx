import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getCursoContenido, solicitarAprobacion,
  crearModulo, editarModulo, eliminarModulo,
  crearLeccion, editarLeccion, eliminarLeccion, subirArchivoLeccion,
} from '../services/instructorService'
import {
  EstadoBadge, useToast, LeccionTipoIcon, TIPO_LECCION,
  IconArrowLeft, IconPlus, IconEdit, IconTrash, IconX, IconSend,
  IconLayers, IconQuiz, IconUpload, IconChevron, IconClock,
} from './instructorUi'
import QuizBuilder from './QuizBuilder'
import styles from './Instructor.module.css'

const TIPOS = ['contenido', 'video', 'recurso', 'quiz']

export default function CursoEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { toast, notify } = useToast()

  const [curso, setCurso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [moduloModal, setModuloModal] = useState(null) // {mode} | modulo
  const [leccionModal, setLeccionModal] = useState(null) // {mode, moduloId} | {leccion, moduloId}
  const [quizLeccion, setQuizLeccion] = useState(null)

  const moduloForm = useForm()
  const leccionForm = useForm()
  const [archivo, setArchivo] = useState(null)
  const [apiError, setApiError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getCursoContenido(slug)
      setCurso(data)
    } finally {
      setLoading(false)
    }
  }, [slug])
  useEffect(() => { cargar() }, [cargar])

  /* ── Módulos ── */
  const abrirModuloCrear = () => {
    setApiError('')
    moduloForm.reset({ titulo: '', descripcion: '' })
    setModuloModal({ mode: 'crear' })
  }
  const abrirModuloEditar = (m) => {
    setApiError('')
    moduloForm.reset({ titulo: m.titulo, descripcion: m.descripcion || '' })
    setModuloModal(m)
  }
  const guardarModulo = async (values) => {
    setApiError('')
    try {
      if (moduloModal.mode === 'crear') {
        const orden = (curso.modulos?.reduce((max, m) => Math.max(max, m.orden), 0) || 0) + 1
        await crearModulo({ curso: curso.id, titulo: values.titulo, descripcion: values.descripcion, orden })
        notify('Módulo agregado')
      } else {
        await editarModulo(moduloModal.id, { titulo: values.titulo, descripcion: values.descripcion })
        notify('Módulo actualizado')
      }
      setModuloModal(null)
      cargar()
    } catch (err) {
      setApiError(errorMsg(err))
    }
  }
  const borrarModulo = async (m) => {
    if (!window.confirm(`¿Eliminar el módulo "${m.titulo}" y todas sus lecciones?`)) return
    try {
      await eliminarModulo(m.id)
      notify('Módulo eliminado')
      cargar()
    } catch (err) { notify(errorMsg(err), 'error') }
  }

  /* ── Lecciones ── */
  const abrirLeccionCrear = (moduloId) => {
    setApiError('')
    setArchivo(null)
    leccionForm.reset({ titulo: '', tipo: 'contenido', contenido: '', recurso_url: '', duracion_minutos: 10, es_obligatoria: true })
    setLeccionModal({ mode: 'crear', moduloId })
  }
  const abrirLeccionEditar = (leccion, moduloId) => {
    setApiError('')
    setArchivo(null)
    leccionForm.reset({
      titulo: leccion.titulo, tipo: leccion.tipo, contenido: leccion.contenido || '',
      recurso_url: leccion.recurso_url || '', duracion_minutos: leccion.duracion_minutos,
      es_obligatoria: leccion.es_obligatoria,
    })
    setLeccionModal({ leccion, moduloId })
  }
  const tipoSel = leccionForm.watch('tipo')

  const guardarLeccion = async (values) => {
    setApiError('')
    try {
      const payload = {
        titulo: values.titulo,
        tipo: values.tipo,
        contenido: values.contenido,
        recurso_url: values.recurso_url,
        duracion_minutos: Number(values.duracion_minutos) || 1,
        es_obligatoria: values.es_obligatoria,
      }
      let leccionId
      if (leccionModal.mode === 'crear') {
        const modulo = curso.modulos.find((m) => m.id === leccionModal.moduloId)
        const orden = (modulo.lecciones?.reduce((max, l) => Math.max(max, l.orden), 0) || 0) + 1
        const { data } = await crearLeccion({ ...payload, modulo: leccionModal.moduloId, orden })
        leccionId = data.id
        notify('Lección agregada')
      } else {
        leccionId = leccionModal.leccion.id
        await editarLeccion(leccionId, payload)
        notify('Lección actualizada')
      }
      if (archivo) {
        const fd = new FormData()
        fd.append('archivo', archivo)
        await subirArchivoLeccion(leccionId, fd)
      }
      setLeccionModal(null)
      cargar()
    } catch (err) {
      setApiError(errorMsg(err))
    }
  }
  const borrarLeccion = async (l) => {
    if (!window.confirm(`¿Eliminar la lección "${l.titulo}"?`)) return
    try {
      await eliminarLeccion(l.id)
      notify('Lección eliminada')
      cargar()
    } catch (err) { notify(errorMsg(err), 'error') }
  }

  const onSolicitar = async () => {
    setBusy(true)
    try {
      await solicitarAprobacion(slug)
      notify('Curso enviado a aprobación')
      cargar()
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo solicitar aprobación', 'error')
    } finally { setBusy(false) }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.stateWrap}><div className={styles.spinner} /></div></div>
  }
  if (!curso) {
    return <div className={styles.page}><div className={styles.stateWrap}><p className={styles.stateTitle}>Curso no encontrado</p></div></div>
  }

  const modulos = curso.modulos || []

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/instructor/cursos')}>Mis cursos</button>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>{curso.titulo}</span>
      </div>

      {/* Header del editor */}
      <div className={styles.editorHead}>
        <div>
          <h1 className={styles.editorTitle}>{curso.titulo}</h1>
          <div className={styles.editorMeta}>
            <EstadoBadge estado={curso.estado} />
            <span className={styles.pageDesc}>{modulos.length} módulos · {curso.lecciones_count ?? modulos.reduce((s, m) => s + (m.lecciones?.length || 0), 0)} lecciones</span>
          </div>
          {curso.estado === 'rechazado' && curso.motivo_rechazo && (
            <div className={styles.rechazoBox}>Motivo del rechazo: {curso.motivo_rechazo}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={styles.btnGhost} onClick={() => navigate('/instructor/cursos')}>
            <IconArrowLeft /> Volver
          </button>
          {(curso.estado === 'borrador' || curso.estado === 'rechazado') && (
            <button className={styles.btnPrimary} disabled={busy || modulos.length === 0} onClick={onSolicitar}>
              <IconSend /> Solicitar aprobación
            </button>
          )}
        </div>
      </div>

      {/* Módulos */}
      {modulos.map((m, idx) => (
        <div key={m.id} className={styles.moduloCard}>
          <div className={styles.moduloHead}>
            <span className={styles.moduloNum}>{idx + 1}</span>
            <span className={styles.moduloTitulo}>{m.titulo}</span>
            <div className={styles.moduloActions}>
              <button className={styles.btnIcon} title="Editar módulo" onClick={() => abrirModuloEditar(m)}><IconEdit /></button>
              <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} title="Eliminar módulo" onClick={() => borrarModulo(m)}><IconTrash /></button>
            </div>
          </div>

          {(m.lecciones || []).map((l) => (
            <div key={l.id} className={styles.leccionRow}>
              <span className={styles.leccionIcon}><LeccionTipoIcon tipo={l.tipo} /></span>
              <div className={styles.leccionInfo}>
                <div className={styles.leccionTitulo}>{l.titulo}</div>
                <div className={styles.leccionSub}>
                  <span className={styles.leccionTag}>{TIPO_LECCION[l.tipo] || l.tipo}</span>
                  <span><IconClock /> {l.duracion_minutos}m</span>
                  {!l.es_obligatoria && <span>· opcional</span>}
                </div>
              </div>
              <div className={styles.leccionActions}>
                {l.tipo === 'quiz' && (
                  <button className={styles.btnGhost} onClick={() => setQuizLeccion(l)}>
                    <IconQuiz /> Evaluación
                  </button>
                )}
                <button className={styles.btnIcon} title="Editar" onClick={() => abrirLeccionEditar(l, m.id)}><IconEdit /></button>
                <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} title="Eliminar" onClick={() => borrarLeccion(l)}><IconTrash /></button>
              </div>
            </div>
          ))}

          <button className={styles.addRow} onClick={() => abrirLeccionCrear(m.id)}>
            <IconPlus /> Agregar lección
          </button>
        </div>
      ))}

      <button className={styles.addModuloBtn} onClick={abrirModuloCrear}>
        <IconLayers /> Agregar módulo
      </button>

      {/* Modal módulo */}
      {moduloModal && (
        <div className={styles.overlay} onClick={() => setModuloModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{moduloModal.mode === 'crear' ? 'Nuevo módulo' : 'Editar módulo'}</h2>
              <button className={styles.closeBtn} onClick={() => setModuloModal(null)}><IconX /></button>
            </div>
            <form onSubmit={moduloForm.handleSubmit(guardarModulo)} noValidate>
              <div className={styles.modalBody}>
                {apiError && <div className={styles.apiError}>{apiError}</div>}
                <div className={styles.field}>
                  <label className={styles.label}>Título del módulo</label>
                  <input className={styles.input} placeholder="Ej. Fundamentos"
                    {...moduloForm.register('titulo', { required: 'Requerido' })} />
                  {moduloForm.formState.errors.titulo && <span className={styles.errorMsg}>{moduloForm.formState.errors.titulo.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Descripción (opcional)</label>
                  <textarea className={styles.textarea} {...moduloForm.register('descripcion')} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setModuloModal(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal lección */}
      {leccionModal && (
        <div className={styles.overlay} onClick={() => setLeccionModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{leccionModal.mode === 'crear' ? 'Nueva lección' : 'Editar lección'}</h2>
              <button className={styles.closeBtn} onClick={() => setLeccionModal(null)}><IconX /></button>
            </div>
            <form onSubmit={leccionForm.handleSubmit(guardarLeccion)} noValidate>
              <div className={styles.modalBody}>
                {apiError && <div className={styles.apiError}>{apiError}</div>}
                <div className={styles.field}>
                  <label className={styles.label}>Título</label>
                  <input className={styles.input} placeholder="Ej. ¿Qué es HTML?"
                    {...leccionForm.register('titulo', { required: 'Requerido' })} />
                  {leccionForm.formState.errors.titulo && <span className={styles.errorMsg}>{leccionForm.formState.errors.titulo.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Tipo de lección</label>
                  <div className={styles.tipoChips}>
                    {TIPOS.map((t) => (
                      <button type="button" key={t}
                        className={`${styles.tipoChip} ${tipoSel === t ? styles.tipoChipActive : ''}`}
                        onClick={() => leccionForm.setValue('tipo', t)}>
                        <LeccionTipoIcon tipo={t} /> {TIPO_LECCION[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {tipoSel !== 'quiz' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Contenido</label>
                    <textarea className={styles.textarea} placeholder="Escribe el contenido de la lección…"
                      {...leccionForm.register('contenido')} />
                  </div>
                )}

                {(tipoSel === 'video' || tipoSel === 'recurso') && (
                  <div className={styles.field}>
                    <label className={styles.label}>{tipoSel === 'video' ? 'URL del video (YouTube/Vimeo/mp4)' : 'URL del recurso'}</label>
                    <input className={styles.input} placeholder="https://…" {...leccionForm.register('recurso_url')} />
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label}>Archivo adjunto (opcional)</label>
                  <label className={styles.btnGhost} style={{ cursor: 'pointer', width: 'fit-content' }}>
                    <IconUpload /> {archivo ? archivo.name : 'Seleccionar archivo'}
                    <input type="file" hidden onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                  </label>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Duración (min)</label>
                    <input type="number" min="1" className={styles.input}
                      {...leccionForm.register('duracion_minutos', { required: true, min: 1 })} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Obligatoria</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 40, fontSize: '0.85rem', color: '#374151' }}>
                      <input type="checkbox" {...leccionForm.register('es_obligatoria')} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                      Cuenta para el progreso
                    </label>
                  </div>
                </div>

                {tipoSel === 'quiz' && leccionModal.mode !== 'crear' && (
                  <p className={styles.hint}>Guarda y luego usa el botón "Evaluación" en la lección para construir el quiz.</p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setLeccionModal(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={leccionForm.formState.isSubmitting}>
                  {leccionForm.formState.isSubmitting ? 'Guardando…' : 'Guardar lección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz builder */}
      {quizLeccion && (
        <QuizBuilder
          leccion={quizLeccion}
          onClose={() => setQuizLeccion(null)}
          onSaved={() => { setQuizLeccion(null); notify('Evaluación guardada'); cargar() }}
        />
      )}

      {toast}
    </div>
  )
}

function errorMsg(err) {
  const d = err.response?.data
  if (typeof d === 'string') return d
  return Object.values(d || {}).flat().join(' ') || 'Ocurrió un error'
}
