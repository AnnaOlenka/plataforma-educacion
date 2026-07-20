import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './CanvasQuiz.module.css'

const CW = 104 // ancho del chip
const CH = 38 // alto del chip

/**
 * Arrastrar y soltar sobre lienzo (canvas_arrastrar).
 * Asigna cada item a una zona objetivo. Incluye fallback por teclado.
 *
 * @param {object}   schema    canvas_schema { width, height, background }.
 * @param {array}    items     [{ id, label, x, y }].
 * @param {array}    targets   [{ id, label, x, y, w, h }].
 * @param {object}   value     { item_id: target_id }.
 * @param {function} onChange  (asignaciones) => void.
 * @param {string}   feedback  'ok' | 'fail' | null.
 * @param {boolean}  disabled  Bloquea interacción.
 */
export default function DragDropCanvas({
  schema = {},
  items = [],
  targets = [],
  value = {},
  onChange,
  feedback,
  disabled,
}) {
  const canvasRef = useRef(null)
  const W = schema.width || 640
  const H = schema.height || 360
  const [drag, setDrag] = useState(null) // { itemId, x, y }

  // Centro de dibujo de cada item según su asignación.
  const centroItem = useCallback(
    (item, idx) => {
      if (drag && drag.itemId === item.id) return { cx: drag.x, cy: drag.y }
      const targetId = value[item.id]
      if (targetId != null) {
        const t = targets.find((tt) => String(tt.id) === String(targetId))
        if (t) {
          // Apila si varios items comparten objetivo.
          const compañeros = items.filter(
            (it, i) => String(value[it.id]) === String(targetId) && i < idx
          ).length
          return { cx: t.x + t.w / 2, cy: t.y + t.h / 2 + compañeros * (CH + 4) }
        }
      }
      return { cx: item.x + CW / 2, cy: item.y + CH / 2 }
    },
    [drag, value, targets, items]
  )

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = schema.background || '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Zonas objetivo
    targets.forEach((t) => {
      const ocupada = Object.values(value).some((v) => String(v) === String(t.id))
      roundRect(ctx, t.x, t.y, t.w, t.h, 10)
      ctx.fillStyle = ocupada ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.10)'
      ctx.fill()
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 2
      ctx.strokeStyle = ocupada ? 'rgba(129,140,248,0.8)' : 'rgba(148,163,184,0.5)'
      ctx.stroke()
      ctx.setLineDash([])
      // Etiqueta de la zona (arriba a la izquierda)
      ctx.fillStyle = 'rgba(226,232,240,0.7)'
      ctx.font = '600 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText((t.label || t.id).toUpperCase(), t.x + 8, t.y + 6)
    })

    // Items
    items.forEach((item, idx) => {
      const { cx, cy } = centroItem(item, idx)
      const x = cx - CW / 2
      const y = cy - CH / 2
      const asignado = value[item.id] != null
      const arrastrando = drag && drag.itemId === item.id

      let fill = '#6366f1'
      if (asignado && feedback === 'ok') fill = '#22c55e'
      else if (asignado && feedback === 'fail') fill = '#ef4444'
      else if (asignado) fill = '#4f46e5'

      ctx.save()
      if (arrastrando) {
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
      }
      roundRect(ctx, x, y, CW, CH, 9)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = '#fff'
      ctx.font = '600 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.label || item.id, cx, cy)
    })
  }, [W, H, schema.background, targets, items, value, drag, feedback, centroItem])

  useEffect(() => { dibujar() }, [dibujar])

  const puntoDesdeEvento = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    }
  }

  const itemEnPunto = (x, y) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const { cx, cy } = centroItem(items[i], i)
      if (Math.abs(x - cx) <= CW / 2 && Math.abs(y - cy) <= CH / 2) return items[i]
    }
    return null
  }

  const targetEnPunto = (x, y) =>
    targets.find((t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h)

  const onMouseDown = (e) => {
    if (disabled) return
    const { x, y } = puntoDesdeEvento(e)
    const item = itemEnPunto(x, y)
    if (item) setDrag({ itemId: item.id, x, y })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e) => {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      setDrag((d) => (d ? {
        ...d,
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      } : d))
    }
    const up = (e) => {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (W / rect.width)
      const y = (e.clientY - rect.top) * (H / rect.height)
      const t = targetEnPunto(x, y)
      setDrag((d) => {
        if (d) {
          const next = { ...value }
          if (t) next[d.itemId] = String(t.id)
          else delete next[d.itemId]
          onChange?.(next)
        }
        return null
      })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, value, targets])

  const setAsignacion = (itemId, targetId) => {
    const next = { ...value }
    if (targetId) next[itemId] = targetId
    else delete next[itemId]
    onChange?.(next)
  }

  return (
    <>
      <div className={`${styles.canvasWrap} ${drag ? styles.canvasDragging : styles.canvasDrag}`} style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={`${styles.canvas} ${drag ? styles.canvasDragging : styles.canvasDrag}`}
          onMouseDown={onMouseDown}
          role="img"
          aria-label="Lienzo interactivo de arrastrar y soltar"
        />
      </div>

      {/* Fallback accesible por teclado */}
      <div className={styles.a11yPanel}>
        {items.map((item) => (
          <div key={item.id} className={styles.a11yRow}>
            <span className={styles.a11yChip}>{item.label || item.id}</span>
            <span className={styles.a11yArrow}>→</span>
            <select
              className={styles.a11ySelect}
              value={value[item.id] || ''}
              disabled={disabled}
              onChange={(e) => setAsignacion(item.id, e.target.value)}
              aria-label={`Asignar ${item.label || item.id} a una zona`}
            >
              <option value="">Sin asignar…</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.label || t.id}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className={styles.canvasHint}>Arrastra los bloques a su zona o usa los menús de abajo</p>
    </>
  )
}
