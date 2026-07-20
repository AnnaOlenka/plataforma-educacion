import api from '../../../services/api'

export const getPanelResumen = () => api.get('/api/admin/panel/')
export const getAdminCursos = (params) => api.get('/api/admin/cursos/', { params })
export const aprobarCurso = (slug) => api.post(`/api/admin/cursos/${slug}/aprobar/`)
export const rechazarCurso = (slug, motivo) => api.post(`/api/admin/cursos/${slug}/rechazar/`, { motivo })
export const archivarCurso = (slug) => api.post(`/api/admin/cursos/${slug}/archivar/`)
export const getAuditoria = (params) => api.get('/api/admin/auditoria/calificaciones/', { params })

const unwrap = (data) => Array.isArray(data) ? data : (data.results || [])
export { unwrap }
