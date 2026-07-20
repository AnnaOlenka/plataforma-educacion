import api from '../../../services/api'

/** Normaliza respuestas paginadas de DRF ({count, results}) o listas planas. */
export const unwrapList = (data) => (Array.isArray(data) ? data : data?.results ?? [])

/* ── Catálogo ── */
export const getCursos = (params) => api.get('/api/cursos/', { params })
export const getCursoDetalle = (slug) => api.get(`/api/cursos/${slug}/`)

/* ── Inscripción ── */
export const inscribirCurso = (slug) => api.post(`/api/cursos/${slug}/inscribir/`)
export const cancelarInscripcion = (slug) =>
  api.post(`/api/cursos/${slug}/cancelar-inscripcion/`)
export const getMisInscripciones = (params) =>
  api.get('/api/inscripciones/', { params })

/* ── Navegación / contenido ── */
export const getNavegacion = (slug) => api.get(`/api/cursos/${slug}/navegacion/`)
export const getLeccion = (id) => api.get(`/api/lecciones/${id}/`)

/* ── Progreso (useProgressTracker) ── */
export const enviarHeartbeat = (payload) =>
  api.post('/api/progreso/heartbeat/', payload)
export const completarLeccion = (leccion_id, tiempo_segundos = 0) =>
  api.post('/api/progreso/completar/', { leccion_id, tiempo_segundos })
export const getResumenProgreso = (slug) =>
  api.get(`/api/progreso/curso/${slug}/`)
