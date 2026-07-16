import api from '../../../services/api'

export const getUsuarios = (params) => api.get('/api/auth/users/', { params })
export const createUsuario = (data) => api.post('/api/auth/register/', data)
export const deleteUsuario = (id) => api.delete(`/api/auth/users/${id}/`)
export const updateUsuario = (id, data) => api.patch(`/api/auth/users/${id}/`, data)
