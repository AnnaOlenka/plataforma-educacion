import api from '../../../services/api'

export const login = (email, password) =>
  api.post('/api/auth/login/', { email, password })

export const register = (data) =>
  api.post('/api/auth/register/', data)

export const forgotPassword = (email) =>
  api.post('/api/auth/password-reset/', { email })
