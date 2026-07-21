// Hook global de autenticación — envuelve el store de Zustand (authStore)
// bajo el nombre useAuthContext exigido por las restricciones técnicas del
// proyecto, sin duplicar el estado ni introducir un React Context aparte.
import useAuthStore from '../store/authStore'

export default function useAuthContext() {
  const { user, token, setAuth, setUser, logout } = useAuthStore()
  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    setAuth,
    setUser,
    logout,
  }
}
