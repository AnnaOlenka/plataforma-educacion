import api from '../../../services/api'

/* ── Lectura ── */
export const getEvaluacionPorLeccion = (leccionId) =>
  api.get(`/api/lecciones/${leccionId}/evaluacion/`)
export const getEvaluacion = (id) => api.get(`/api/evaluaciones/${id}/`)
export const getMisIntentos = (evaluacionId) =>
  api.get(`/api/evaluaciones/${evaluacionId}/intentos/`)

/* ── Ciclo del intento ── */
export const iniciarIntento = (evaluacionId) =>
  api.post(`/api/evaluaciones/${evaluacionId}/iniciar/`)

/** Validación en tiempo real de una respuesta (sin cerrar el intento). */
export const validarRespuesta = (evaluacionId, { pregunta_id, respuesta, canvas_payload }) =>
  api.post(`/api/evaluaciones/${evaluacionId}/validar/`, {
    pregunta_id,
    respuesta,
    canvas_payload,
  })

/** Envía y califica el intento completo. */
export const enviarIntento = (evaluacionId, { intento_id, respuestas, canvas_payload }) =>
  api.post(`/api/evaluaciones/${evaluacionId}/enviar/`, {
    intento_id,
    respuestas,
    canvas_payload,
  })
