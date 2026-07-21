import api from '../../../services/api'

export const getDashboard = () => api.get('/api/analytics/dashboard/')
export const getDashboardCurso = (slug) => api.get(`/api/analytics/dashboard/curso/${slug}/`)
export const exportarPDF = (slug = null) =>
  api.get(
    slug
      ? `/api/analytics/dashboard/curso/${slug}/exportar.pdf`
      : '/api/analytics/dashboard/exportar.pdf',
    { responseType: 'blob' }
  )

export const getInstructorAnalytics = () => api.get('/api/analytics/instructor/')
export const exportarInstructorPDF = () =>
  api.get('/api/analytics/instructor/exportar.pdf', { responseType: 'blob' })
