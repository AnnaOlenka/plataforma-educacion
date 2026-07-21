import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCursos,
  getMisInscripciones,
  inscribirCurso,
  unwrapList,
} from '../services/cursosService'
import useToast from '../hooks/useToast.jsx'
import CursoCard from './CursoCard'
import { IconSearch, IconChevron, IconBookOpen } from './cursosUi'
import styles from './Cursos.module.css'

const NIVELES = [
  { v: '', l: 'Todos' },
  { v: 'basico', l: 'Básico' },
  { v: 'intermedio', l: 'Intermedio' },
  { v: 'avanzado', l: 'Avanzado' },
]

export default function CatalogoCursos() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [nivel, setNivel] = useState('')
  const [inscribiendo, setInscribiendo] = useState(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()
  const { toast, notify } = useToast()

  const fetchCursos = async (searchVal, nivelVal) => {
    setLoading(true)
    try {
      const params = { estado: 'publicado' }
      if (searchVal) params.search = searchVal
      if (nivelVal) params.nivel = nivelVal
      const [{ data: cursosData }, { data: inscData }] = await Promise.all([
        getCursos(params),
        getMisInscripciones(),
      ])
      const lista = unwrapList(cursosData)
      const inscripciones = unwrapList(inscData)
      const completadoSlugSet = new Set(
        inscripciones.filter((i) => i.estado === 'completada').map((i) => i.curso_slug || i.curso?.slug)
      )
      setCursos(lista.map((c) => ({
        ...c,
        completado: completadoSlugSet.has(c.slug),
      })))
    } catch {
      notify('No se pudo cargar el catálogo', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial + refetch por nivel (inmediato).
  useEffect(() => {
    fetchCursos(search, nivel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel])

  // Búsqueda con debounce.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCursos(search, nivel), 350)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const abrirDetalle = (curso) => navigate(`/cursos/${curso.slug}`)

  const onPrimary = async (curso, accion) => {
    if (accion === 'continuar') {
      navigate(`/cursos/${curso.slug}/aprender`)
      return
    }
    setInscribiendo(curso.slug)
    try {
      await inscribirCurso(curso.slug)
      notify(`Te inscribiste en "${curso.titulo}"`)
      setCursos((prev) =>
        prev.map((c) =>
          c.slug === curso.slug
            ? { ...c, inscrito: true, inscritos_count: (c.inscritos_count ?? 0) + 1 }
            : c
        )
      )
    } catch (err) {
      notify(err.response?.data?.detail || 'No se pudo inscribir', 'error')
    } finally {
      setInscribiendo(null)
    }
  }

  const skeletons = useMemo(() => Array.from({ length: 6 }), [])

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbRoot}>EduPath</span>
        <IconChevron />
        <span className={styles.breadcrumbCurrent}>Catálogo de cursos</span>
      </div>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Catálogo de cursos</h1>
            {!loading && <span className={styles.countBadge}>{cursos.length}</span>}
          </div>
          <p className={styles.pageDesc}>
            Explora los cursos publicados e inscríbete para comenzar a aprender
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <IconSearch />
          <input
            className={styles.searchInput}
            placeholder="Buscar cursos, temas o instructores…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.segmented}>
          {NIVELES.map((n) => (
            <button
              key={n.v}
              className={`${styles.segment} ${nivel === n.v ? styles.segmentActive : ''}`}
              onClick={() => setNivel(n.v)}
            >
              {n.l}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className={styles.skelGrid}>
          {skeletons.map((_, i) => (
            <div key={i} className={styles.skelCard} />
          ))}
        </div>
      ) : cursos.length === 0 ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconBookOpen /></div>
          <p className={styles.stateTitle}>No encontramos cursos</p>
          <p className={styles.stateDesc}>
            {search || nivel
              ? 'Prueba con otros términos de búsqueda o cambia el filtro de nivel.'
              : 'Aún no hay cursos publicados en la plataforma.'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {cursos.map((curso) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              onOpen={abrirDetalle}
              onPrimary={onPrimary}
              loading={inscribiendo === curso.slug}
            />
          ))}
        </div>
      )}

      {toast}
    </div>
  )
}
