import { useCallback, useEffect, useRef } from 'react'
import styles from './CanvasQuiz.module.css'

/**
 * Selección sobre lienzo (canvas_hotspot).
 * El estudiante hace clic o navega con teclado para elegir una zona.
 *
 * @param {object}   schema    canvas_schema { width, height, background }.
 * @param {array}    hotspots  [{ id, x, y, r, label }].
 * @param {string}   value     hotspot_id seleccionado.
 * @param {function} onChange  (hotspot_id) => void.
 * @param {string}   feedback  'ok' | 'fail' | null (validación en tiempo real).
 * @param {boolean}  disabled  Bloquea interacción (tras enviar).
 */
export default function HotspotCanvas({
  schema = {},
  hotspots = [],
  value,
  onChange,
  feedback,
  disabled,
}) {
  const canvasRef = useRef(null)
  const W = schema.width || 640
  const H = schema.height || 360

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // Fondo
    ctx.fillStyle = schema.background || '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Cuadrícula sutil
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
    }
    for (let gy = 0; gy <= H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
    }

    // Hotspots
    hotspots.forEach((h) => {
      const seleccionado = String(h.id) === String(value)
      let fill = 'rgba(148,163,184,0.18)'
      let stroke = 'rgba(148,163,184,0.55)'
      if (seleccionado) {
        if (feedback === 'ok') { fill = 'rgba(34,197,94,0.28)'; stroke = '#22c55e' }
        else if (feedback === 'fail') { fill = 'rgba(239,68,68,0.28)'; stroke = '#ef4444' }
        else { fill = 'rgba(99,102,241,0.32)'; stroke = '#818cf8' }
      }
      ctx.beginPath()
      ctx.arc(h.x, h.y, h.r || 32, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = seleccionado ? 3 : 2
      ctx.strokeStyle = stroke
      ctx.stroke()

      // Etiqueta
      ctx.fillStyle = seleccionado ? '#fff' : 'rgba(226,232,240,0.85)'
      ctx.font = '600 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(h.label || h.id, h.x, h.y)

      // Check de selección
      if (seleccionado) {
        ctx.beginPath()
        ctx.arc(h.x + (h.r || 32) - 6, h.y - (h.r || 32) + 6, 9, 0, Math.PI * 2)
        ctx.fillStyle = feedback === 'fail' ? '#ef4444' : feedback === 'ok' ? '#22c55e' : '#6366f1'
        ctx.fill()
      }
    })
  }, [W, H, schema.background, hotspots, value, feedback])

  useEffect(() => { dibujar() }, [dibujar])

  const puntoDesdeEvento = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const escalaX = W / rect.width
    const escalaY = H / rect.height
    return {
      x: (e.clientX - rect.left) * escalaX,
      y: (e.clientY - rect.top) * escalaY,
    }
  }

  const onClick = (e) => {
    if (disabled) return
    const { x, y } = puntoDesdeEvento(e)
    const hit = hotspots.find((h) => {
      const dx = x - h.x
      const dy = y - h.y
      const r = h.r || 32
      return dx * dx + dy * dy <= r * r
    })
    if (hit) onChange?.(String(hit.id))
  }

  return (
    <>
      <div className={styles.canvasWrap} style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={styles.canvas}
          onClick={onClick}
          role="img"
          aria-label="Lienzo interactivo de selección"
        />
        {/* Capa accesible: un botón enfocable por hotspot */}
        <div className={styles.overlay}>
          {hotspots.map((h) => (
            <button
              key={h.id}
              type="button"
              className={styles.hotBtn}
              disabled={disabled}
              onClick={() => onChange?.(String(h.id))}
              aria-pressed={String(h.id) === String(value)}
              aria-label={`Seleccionar ${h.label || h.id}`}
              style={{
                left: `${(h.x / W) * 100}%`,
                top: `${(h.y / H) * 100}%`,
                width: `${((h.r || 32) * 2 / W) * 100}%`,
                height: `${((h.r || 32) * 2 / H) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
      <p className={styles.canvasHint}>Haz clic en una zona o usa Tab + Enter para seleccionar</p>
    </>
  )
}
