/**
 * Descarga básica de lecciones para lectura sin conexión (RNF06).
 * Usa Cache Storage directamente desde la app: el contenido ya obtenido
 * por getLeccion() se guarda tal cual, sin depender de que el Service
 * Worker intercepte peticiones cross-origin al backend.
 */
const CACHE_NAME = 'edupath-lecciones-v1'
const cacheKey = (id) => `https://edupath.offline/leccion/${id}`

export const offlineSoportado = () => typeof caches !== 'undefined'

export async function guardarLeccionOffline(id, data) {
  if (!offlineSoportado()) return false
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
    await cache.put(cacheKey(id), response)
    return true
  } catch {
    return false
  }
}

export async function leerLeccionOffline(id) {
  if (!offlineSoportado()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const match = await cache.match(cacheKey(id))
    return match ? await match.json() : null
  } catch {
    return null
  }
}

export async function leccionDisponibleOffline(id) {
  if (!offlineSoportado()) return false
  try {
    const cache = await caches.open(CACHE_NAME)
    return Boolean(await cache.match(cacheKey(id)))
  } catch {
    return false
  }
}
