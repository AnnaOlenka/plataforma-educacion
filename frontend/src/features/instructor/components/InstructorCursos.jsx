import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  getMisCursos, crearCurso, editarCurso, eliminarCurso, solicitarAprobacion, unwrap,
} from '../services/instructorService'
import {
  EstadoBadge, gradientFor, useToast,
  IconPlus, IconEdit, IconTrash, IconX, IconSend, IconSettings,
  IconUsers, IconLayers, IconChart, IconBook,
} from './instructorUi'
import styles from './Instructor.module.css'

const NIVELES = [
  { v: 'basico', l: 'Básico' },
  { v: 'intermedio', l: 'Intermedio' },
  { v: 'avanzado', l: 'Avanzado' },
]

export default function InstructorCursos() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'crear' | curso(editar)
  const [apiError, setApiError] = useState('')
  const [busy, setBusy] = useState(null)
  const navigate = useNavigate()
  const { toast, notify } = useToast()
  const form = useForm()

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await getMisCursos({ page_size: 50 })
      setCursos(unwrap(data))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setApiError('')
    form.reset({ titulo: '', descripcion: '', nivel: 'intermedio' })
    setModal('crear')
  }
  const abrirEditar = (curso) => {
    setApiError('')
    form.reset({ titulo: curso.titulo, descripcion: curso.descripcion || '', nivel: curso.nivel })
    setModal(curso)
  }

  const onSubmit = async (values) => {
    setApiError('')
    try {
      if (modal === 'crear') {
        await crearCurso(values)
        notify('Curso creado como borrador')
      } else {
        await editarCurso(modal.slug, values)
        notify('Curso actualizado')
      }
      setModal(null)
      cargar()
    } catch (err) {
      const d = err.response?.data
      setApiError(typeof d === 'string' ? d : Object.values(d || {}).flat().join(' ') || 'Error al guardar')
    }
  }

  const onSolicitar = async (curso) => {
    setBusy(curso.slug)
    try {
      await solicitarAprobacion(curso.slug)
      notify('Curso enviado a aprobación')
      cargar()
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo solicitar aprobación', 'error')
    } finally {
      setBusy(null)
    }
  }

  const onEliminar = async (curso) => {
    if (!window.confirm(`¿Eliminar el curso "${curso.titulo}"? Esta acción no se puede deshacer.`)) return
    setBusy(curso.slug)
    try {
      await eliminarCurso(curso.slug)
      setCursos((prev) => prev.filter((c) => c.slug !== curso.slug))
      notify('Curso eliminado')
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo eliminar', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Mis cursos</h1>
            {!loading && <span className={styles.countBadge}>{cursos.length}</span>}
          </div>
          <p className={styles.pageDesc}>Crea, edita y publica tus cursos</p>
        </div>
        <button className={styles.btnPrimary} onClick={abrirCrear}>
          <IconPlus /> Nuevo curso
        </button>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : cursos.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconBook /></div>
          <p className={styles.stateTitle}>Todavía no tienes cursos</p>
          <p className={styles.stateDesc}>Crea tu primer curso y empieza a agregar contenido.</p>
          <button className={styles.btnPrimary} onClick={abrirCrear}><IconPlus /> Crear curso</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {cursos.map((c) => (
            <article key={c.id} className={styles.courseCard}>
              <div className={styles.courseCover} style={{ background: gradientFor(c) }}>
                <span />
                <EstadoBadge estado={c.estado} onCover />
              </div>
              <div className={styles.courseBody}>
                <h3 className={styles.courseTitle}>{c.titulo}</h3>
                <div className={styles.courseMeta}>
                  <span className={styles.courseMetaItem}><IconUsers /> {c.inscritos} inscritos</span>
                  <span className={styles.courseMetaItem}><IconLayers /> {c.modulos_count} módulos</span>
                  <span className={styles.courseMetaItem}>{c.lecciones_count} lecciones</span>
                </div>

                {c.estado === 'rechazado' && c.motivo_rechazo && (
                  <div className={styles.rechazoBox}>Motivo del rechazo: {c.motivo_rechazo}</div>
                )}

                <div className={styles.courseActions}>
                  <button className={styles.btnPrimary} style={{ flex: 1 }}
                    onClick={() => navigate(`/instructor/cursos/${c.slug}/editar`)}>
                    <IconSettings /> Contenido
                  </button>
                  <button className={styles.btnIcon} title="Analíticas"
                    onClick={() => navigate(`/instructor/cursos/${c.slug}/analitica`)}>
                    <IconChart />
                  </button>
                  <button className={styles.btnIcon} title="Editar" onClick={() => abrirEditar(c)}>
                    <IconEdit />
                  </button>
                  <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} title="Eliminar"
                    disabled={busy === c.slug} onClick={() => onEliminar(c)}>
                    <IconTrash />
                  </button>
                </div>

                {(c.estado === 'borrador' || c.estado === 'rechazado') && (
                  <button className={styles.btnGhost} style={{ width: '100%' }}
                    disabled={busy === c.slug} onClick={() => onSolicitar(c)}>
                    <IconSend /> Solicitar aprobación
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modal === 'crear' ? 'Nuevo curso' : 'Editar curso'}</h2>
              <button className={styles.closeBtn} onClick={() => setModal(null)}><IconX /></button>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className={styles.modalBody}>
                {apiError && <div className={styles.apiError}>{apiError}</div>}
                <div className={styles.field}>
                  <label className={styles.label}>Título del curso</label>
                  <input className={styles.input} placeholder="Ej. Introducción a React"
                    {...form.register('titulo', { required: 'El título es requerido' })} />
                  {form.formState.errors.titulo && <span className={styles.errorMsg}>{form.formState.errors.titulo.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Descripción</label>
                  <textarea className={styles.textarea} placeholder="¿Qué aprenderán los estudiantes?"
                    {...form.register('descripcion', { required: 'La descripción es requerida' })} />
                  {form.formState.errors.descripcion && <span className={styles.errorMsg}>{form.formState.errors.descripcion.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Nivel</label>
                  <select className={styles.select} {...form.register('nivel', { required: true })}>
                    {NIVELES.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
                  </select>
                </div>
                {modal === 'crear' && (
                  <p className={styles.hint}>El curso se crea como borrador. Podrás agregar contenido y luego solicitar su aprobación.</p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando…' : (modal === 'crear' ? 'Crear curso' : 'Guardar cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast}
    </div>
  )
}
