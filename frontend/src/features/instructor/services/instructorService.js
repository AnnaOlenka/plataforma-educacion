import api from '../../../services/api'

export const unwrap = (data) => (Array.isArray(data) ? data : data?.results ?? [])

/* ── Panel / analíticas ── */
export const getPanel = () => api.get('/api/instructor/panel/')
export const getAnalyticsCurso = (slug) =>
  api.get(`/api/instructor/analytics/cursos/${slug}/`)

/* ── Cursos (crear/editar/borrar vía catálogo; listar vía instructor) ── */
export const getMisCursos = (params) => api.get('/api/instructor/cursos/', { params })
export const getMiCurso = (slug) => api.get(`/api/instructor/cursos/${slug}/`)
export const crearCurso = (data) => api.post('/api/cursos/', data)
export const editarCurso = (slug, data) => api.patch(`/api/cursos/${slug}/`, data)
export const eliminarCurso = (slug) => api.delete(`/api/cursos/${slug}/`)
export const solicitarAprobacion = (slug) =>
  api.post(`/api/instructor/cursos/${slug}/solicitar-aprobacion/`)

/* ── Detalle de contenido (módulos + lecciones) ── */
export const getCursoContenido = (slug) => api.get(`/api/cursos/${slug}/`)

/* ── Módulos ── */
export const crearModulo = (data) => api.post('/api/instructor/modulos/', data)
export const editarModulo = (id, data) => api.patch(`/api/instructor/modulos/${id}/`, data)
export const eliminarModulo = (id) => api.delete(`/api/instructor/modulos/${id}/`)

/* ── Lecciones ── */
export const crearLeccion = (data) => api.post('/api/instructor/lecciones/', data)
export const editarLeccion = (id, data) => api.patch(`/api/instructor/lecciones/${id}/`, data)
export const eliminarLeccion = (id) => api.delete(`/api/instructor/lecciones/${id}/`)
export const subirArchivoLeccion = (id, formData) =>
  api.post(`/api/instructor/lecciones/${id}/subir-archivo/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/* ── Evaluaciones / quizzes ── */
export const getEvaluaciones = (params) =>
  api.get('/api/instructor/evaluaciones/', { params })
export const crearEvaluacion = (data) => api.post('/api/instructor/evaluaciones/', data)
export const editarEvaluacion = (id, data) =>
  api.patch(`/api/instructor/evaluaciones/${id}/`, data)
export const eliminarEvaluacion = (id) => api.delete(`/api/instructor/evaluaciones/${id}/`)

/* ── Intentos / calificación manual ── */
export const getIntentos = (params) => api.get('/api/instructor/intentos/', { params })
export const getIntento = (id) => api.get(`/api/instructor/intentos/${id}/`)
export const calificarIntento = (id, data) =>
  api.post(`/api/instructor/intentos/${id}/calificar/`, data)
