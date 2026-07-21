import api from '../../../services/api'

export const login = (email, password) =>
  api.post('/api/auth/login/', { email, password })

export const register = (data) =>
  api.post('/api/auth/register/', data)

export const forgotPassword = (email) =>
  api.post('/api/auth/password-reset/', { email })

export const resetPassword = (uid, token, new_password, new_password_confirm) =>
  api.post('/api/auth/password-reset/confirm/', { uid, token, new_password, new_password_confirm })

export const getMe = () =>
  api.get('/api/auth/me/')

export const updateMe = (data) =>
  api.patch('/api/auth/me/', data)

export const changePassword = (old_password, new_password, new_password_confirm) =>
  api.post('/api/auth/change-password/', { old_password, new_password, new_password_confirm })
