export const ROUTES = {
  // Públicas / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/recuperar-cuenta',
  VERIFICAR_PUBLIC: '/verificar',
  VERIFICAR_CODIGO_PUBLIC: '/verificar/:codigo',

  // Admin
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    USUARIOS: '/admin/usuarios',
    CURSOS: '/admin/cursos',
    AUDITORIA: '/admin/auditoria',
    ANALITICAS: '/admin/analiticas',
  },

  // Instructor
  INSTRUCTOR: {
    ROOT: '/instructor',
    DASHBOARD: '/instructor/dashboard',
    CURSOS: '/instructor/cursos',
    CURSO_EDITAR: '/instructor/cursos/:slug/editar',
    CURSO_ANALITICA: '/instructor/cursos/:slug/analitica',
    CALIFICACIONES: '/instructor/calificaciones',
    ANALITICAS: '/instructor/analiticas',
  },

  // Cursos / Estudiante
  CURSOS: {
    ROOT: '/cursos',
    CATALOGO: '/cursos/catalogo',
    DETALLE: '/cursos/:slug',
    APRENDER: '/cursos/:slug/aprender',
  },

  // General Autenticado
  PERFIL: '/perfil',
  PROGRESO: '/progreso',
  CERTIFICADOS: '/certificados',
  VERIFICAR_CERTIFICADO: '/certificados/verificar/:codigo',
  EVALUACIONES: '/evaluaciones',
  EVALUACION_RUNNER: '/evaluaciones/leccion/:leccionId',

  // Errores
  ERROR_403: '/403',
  ERROR_404: '/404',
  ERROR_500: '/500',
}

/**
 * Obtiene la ruta inicial por defecto basada en el rol del usuario.
 */
export function getHomeRouteForRole(role) {
  switch (role) {
    case 'admin':
      return ROUTES.ADMIN.DASHBOARD
    case 'instructor':
      return ROUTES.INSTRUCTOR.DASHBOARD
    case 'estudiante':
    default:
      return ROUTES.CURSOS.ROOT
  }
}
