import { useCallback, useEffect, useRef, useState } from 'react'
import { enviarHeartbeat, completarLeccion } from '../services/cursosService'

/**
 * useProgressTracker — rastrea el tiempo dedicado a una lección y envía
 * heartbeats periódicos al backend (RF-02 marcadores de progreso).
 *
 * @param {number|null} leccionId  Lección activa.
 * @param {object}      opts
 * @param {number}      opts.intervalMs  Intervalo entre heartbeats (default 15s).
 * @param {number}      opts.porcentajeInicial  % conocido al montar.
 * @param {string}      opts.estadoInicial  Estado conocido al montar.
 * @param {function}    opts.onCursoProgreso  Callback(curso_pct) tras cada envío.
 */
export default function useProgressTracker(leccionId, opts = {}) {
  const {
    intervalMs = 15000,
    porcentajeInicial = 0,
    estadoInicial = 'no_iniciada',
    onCursoProgreso,
  } = opts

  const [tiempo, setTiempo] = useState(0)
  const [porcentaje, setPorcentaje] = useState(porcentajeInicial)
  const [estado, setEstado] = useState(estadoInicial)
  const [guardando, setGuardando] = useState(false)

  const tiempoRef = useRef(0)
  const porcentajeRef = useRef(porcentajeInicial)
  const dirtyRef = useRef(false)

  // Reinicia contadores al cambiar de lección.
  useEffect(() => {
    setTiempo(0)
    setPorcentaje(porcentajeInicial)
    setEstado(estadoInicial)
    tiempoRef.current = 0
    porcentajeRef.current = porcentajeInicial
    dirtyRef.current = false
  }, [leccionId, porcentajeInicial, estadoInicial])

  // Cronómetro: +1s por segundo mientras haya lección activa.
  useEffect(() => {
    if (!leccionId) return
    const id = setInterval(() => {
      tiempoRef.current += 1
      setTiempo(tiempoRef.current)
      dirtyRef.current = true
    }, 1000)
    return () => clearInterval(id)
  }, [leccionId])

  const flush = useCallback(async () => {
    if (!leccionId || !dirtyRef.current) return
    dirtyRef.current = false
    try {
      const pct = Math.max(porcentajeRef.current, estado === 'completada' ? 100 : 0)
      const { data } = await enviarHeartbeat({
        leccion_id: leccionId,
        porcentaje: pct,
        tiempo_segundos: tiempoRef.current,
      })
      if (data?.curso_progreso_pct != null) onCursoProgreso?.(data.curso_progreso_pct)
    } catch {
      /* silencioso: reintenta en el siguiente ciclo */
      dirtyRef.current = true
    }
  }, [leccionId, estado, onCursoProgreso])

  // Heartbeat periódico + al desmontar / cerrar pestaña.
  useEffect(() => {
    if (!leccionId) return
    const id = setInterval(flush, intervalMs)
    const onHide = () => flush()
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(id)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [leccionId, intervalMs, flush])

  /** Marca la lección como completada (100%). */
  const marcarCompletada = useCallback(async () => {
    if (!leccionId) return null
    setGuardando(true)
    try {
      const { data } = await completarLeccion(leccionId, tiempoRef.current)
      setPorcentaje(100)
      setEstado('completada')
      porcentajeRef.current = 100
      dirtyRef.current = false
      if (data?.curso_progreso_pct != null) onCursoProgreso?.(data.curso_progreso_pct)
      return data
    } finally {
      setGuardando(false)
    }
  }, [leccionId, onCursoProgreso])

  return { tiempo, porcentaje, estado, guardando, marcarCompletada, flush }
}
