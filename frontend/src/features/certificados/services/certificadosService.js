import api from '../../../services/api'

export const getMisCertificados = () => api.get('/api/certificados/')
export const emitirCertificado = (slug) => api.post(`/api/certificados/emitir/${slug}/`)
export const getCertificadoPDF = (codigo) =>
  api.get(`/api/certificados/${codigo}/pdf/`, { responseType: 'blob' })
export const getCertificadoQR = (codigo) =>
  api.get(`/api/certificados/${codigo}/qr/`, { responseType: 'blob' })
export const verificarPorUUID = (codigo) =>
  api.get(`/api/certificados/verificar/${codigo}/`, { skipAuth: true })
export const verificarPorHash = (payload) =>
  api.post('/api/certificados/verificar/', payload, { skipAuth: true })
