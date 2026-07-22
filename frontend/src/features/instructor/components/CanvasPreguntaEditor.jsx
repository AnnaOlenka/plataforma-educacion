import { useCallback, useEffect, useRef, useState } from 'react'
import { IconPlus, IconTrash } from './instructorUi'
import styles from './Instructor.module.css'

export const CANVAS_W = 600
export const CANVAS_H = 280
const ITEM_W = 104
const ITEM_H = 36

const genId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Editor visual de preguntas Canvas para el instructor.
 * modo: 'canvas_hotspot' | 'canvas_arrastrar'
 */
export default function CanvasPreguntaEditor({
  modo,
  hotspots, correctaHotspotId, onHotspotsChange, onCorrectaHotspotChange,
  items, targets, asignaciones, onItemsChange, onTargetsChange, onAsignacionesChange,
}) {
  return modo === 'canvas_hotspot' ? (
    <HotspotEditor
      hotspots={hotspots}
      correctaId={correctaHotspotId}
      onHotspotsChange={onHotspotsChange}
      onCorrectaChange={onCorrectaHotspotChange}
    />
  ) : (
    <ArrastrarEditor
      items={items}
      targets={targets}
      asignaciones={asignaciones}
      onItemsChange={onItemsChange}
      onTargetsChange={onTargetsChange}
      onAsignacionesChange={onAsignacionesChange}
    />
  )
}

/* ══════════════════ Hotspot: click para agregar, arrastrar para mover ══════════════════ */
function HotspotEditor({ hotspots, correctaId, onHotspotsChange, onCorrectaChange }) {
  const canvasRef = useRef(null)
  const [dragId, setDragId] = useState(null)
  const downInfo = useRef(null) // { x, y } del mousedown, para distinguir clic de arrastre

  const punto = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - rect.left) * (CANVAS_W / rect.width)),
      y: Math.round((e.clientY - rect.top) * (CANVAS_H / rect.height)),
    }
  }

  const hotspotEn = (x, y) =>
    hotspots.find((h) => (x - h.x) ** 2 + (y - h.y) ** 2 <= (h.r || 34) ** 2)

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    for (let gx = 0; gx <= CANVAS_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke() }
    for (let gy = 0; gy <= CANVAS_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke() }

    hotspots.forEach((h, i) => {
      const esCorrecta = h.id === correctaId
      ctx.beginPath()
      ctx.arc(h.x, h.y, h.r || 34, 0, Math.PI * 2)
      ctx.fillStyle = esCorrecta ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.2)'
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = esCorrecta ? '#22c55e' : '#818cf8'
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = '700 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), h.x, h.y)
    })
  }, [hotspots, correctaId])

  useEffect(() => { dibujar() }, [dibujar])

  const onMouseDown = (e) => {
    const { x, y } = punto(e)
    const hit = hotspotEn(x, y)
    downInfo.current = { x, y }
    if (hit) setDragId(hit.id)
  }
  const onMouseMove = (e) => {
    if (!dragId) return
    const { x, y } = punto(e)
    onHotspotsChange(hotspots.map((h) => (h.id === dragId
      ? { ...h, x: Math.max(0, Math.min(CANVAS_W, x)), y: Math.max(0, Math.min(CANVAS_H, y)) }
      : h)))
  }
  // Toda la lógica de clic-vs-arrastre vive en mouseup: el navegador dispara
  // un evento click nativo después de soltar (incluso tras arrastrar), y para
  // entonces el estado de arrastre ya se limpió — depender de onClick crearía
  // una zona fantasma en el punto donde se soltó el arrastre.
  const onMouseUp = (e) => {
    const info = downInfo.current
    downInfo.current = null
    if (dragId) { setDragId(null); return } // fue mover una zona existente
    if (!info) return
    const { x, y } = punto(e)
    if (Math.hypot(x - info.x, y - info.y) > 4) return // arrastre sobre vacío: no crear nada
    if (hotspotEn(info.x, info.y)) return
    const nueva = { id: genId('zona'), x: info.x, y: info.y, r: 34, label: `Zona ${hotspots.length + 1}` }
    onHotspotsChange([...hotspots, nueva])
    if (!correctaId) onCorrectaChange(nueva.id)
  }
  const onMouseLeave = () => { setDragId(null); downInfo.current = null }

  const actualizar = (id, patch) => onHotspotsChange(hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const eliminar = (id) => {
    onHotspotsChange(hotspots.filter((h) => h.id !== id))
    if (correctaId === id) onCorrectaChange(null)
  }

  return (
    <div className={styles.canvasEditor}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvasEditorStage}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
      <p className={styles.canvasEditorHint}>
        Clic en el lienzo para agregar una zona · arrastra una zona existente para moverla
      </p>

      {hotspots.length === 0 ? (
        <p className={styles.canvasEditorEmpty}>Aún no hay zonas. Haz clic en el lienzo para crear la primera.</p>
      ) : (
        <div className={styles.canvasEditorList}>
          {hotspots.map((h, i) => (
            <div key={h.id} className={styles.canvasEditorRow}>
              <span className={styles.canvasEditorNum}>{i + 1}</span>
              <input
                type="radio"
                name="hotspot-correcta"
                checked={h.id === correctaId}
                onChange={() => onCorrectaChange(h.id)}
                title="Marcar como zona correcta"
                style={{ width: 17, height: 17, accentColor: '#16a34a', flexShrink: 0 }}
              />
              <input
                className={styles.input}
                value={h.label}
                onChange={(e) => actualizar(h.id, { label: e.target.value })}
                placeholder="Etiqueta"
                style={{ flex: 1 }}
              />
              <input
                type="number" min="12" max="100"
                className={styles.input}
                value={h.r}
                onChange={(e) => actualizar(h.id, { r: Number(e.target.value) || 34 })}
                title="Radio"
                style={{ width: 64 }}
              />
              <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={() => eliminar(h.id)} title="Eliminar zona">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════ Arrastrar: elementos + zonas objetivo ══════════════════ */
function ArrastrarEditor({ items, targets, asignaciones, onItemsChange, onTargetsChange, onAsignacionesChange }) {
  const canvasRef = useRef(null)
  const [herramienta, setHerramienta] = useState('item') // 'item' | 'zona'
  const [drag, setDrag] = useState(null) // { kind: 'item'|'target', id } | { kind: 'draw', start:{x,y}, cur:{x,y} }
  const downInfo = useRef(null) // { x, y, vacio } del mousedown

  const punto = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: Math.round((e.clientX - rect.left) * (CANVAS_W / rect.width)),
      y: Math.round((e.clientY - rect.top) * (CANVAS_H / rect.height)),
    }
  }

  const itemEn = (x, y) => items.find((it) => Math.abs(x - (it.x + ITEM_W / 2)) <= ITEM_W / 2 && Math.abs(y - (it.y + ITEM_H / 2)) <= ITEM_H / 2)
  const targetEn = (x, y) => targets.find((t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h)

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    targets.forEach((t) => {
      roundRect(ctx, t.x, t.y, t.w, t.h, 10)
      ctx.fillStyle = 'rgba(148,163,184,0.12)'
      ctx.fill()
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(148,163,184,0.6)'
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(226,232,240,0.75)'
      ctx.font = '600 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText((t.label || t.id).toUpperCase(), t.x + 8, t.y + 6)
    })

    if (drag?.kind === 'draw') {
      const { start, cur } = drag
      const x = Math.min(start.x, cur.x), y = Math.min(start.y, cur.y)
      const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y)
      roundRect(ctx, x, y, w, h, 10)
      ctx.fillStyle = 'rgba(99,102,241,0.18)'
      ctx.fill()
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    items.forEach((item) => {
      roundRect(ctx, item.x, item.y, ITEM_W, ITEM_H, 9)
      ctx.fillStyle = '#6366f1'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.label || item.id, item.x + ITEM_W / 2, item.y + ITEM_H / 2)
    })
  }, [items, targets, drag])

  useEffect(() => { dibujar() }, [dibujar])

  const onMouseDown = (e) => {
    const { x, y } = punto(e)
    const it = itemEn(x, y)
    if (it) { downInfo.current = { x, y, vacio: false }; setDrag({ kind: 'item', id: it.id, offX: x - it.x, offY: y - it.y }); return }
    const t = targetEn(x, y)
    if (t) { downInfo.current = { x, y, vacio: false }; setDrag({ kind: 'target', id: t.id, offX: x - t.x, offY: y - t.y }); return }
    downInfo.current = { x, y, vacio: true }
    if (herramienta === 'zona') setDrag({ kind: 'draw', start: { x, y }, cur: { x, y } })
  }

  const onMouseMove = (e) => {
    if (!drag) return
    const { x, y } = punto(e)
    if (drag.kind === 'item') {
      onItemsChange(items.map((it) => (it.id === drag.id
        ? { ...it, x: Math.max(0, Math.min(CANVAS_W - ITEM_W, x - drag.offX)), y: Math.max(0, Math.min(CANVAS_H - ITEM_H, y - drag.offY)) }
        : it)))
    } else if (drag.kind === 'target') {
      onTargetsChange(targets.map((t) => (t.id === drag.id
        ? { ...t, x: Math.max(0, Math.min(CANVAS_W - t.w, x - drag.offX)), y: Math.max(0, Math.min(CANVAS_H - t.h, y - drag.offY)) }
        : t)))
    } else if (drag.kind === 'draw') {
      setDrag((d) => ({ ...d, cur: { x, y } }))
    }
  }

  // Igual que en HotspotEditor: toda la decisión clic-vs-arrastre se resuelve
  // en mouseup (sin onClick) para que un arrastre nunca cree un item fantasma.
  const onMouseUp = (e) => {
    const info = downInfo.current
    downInfo.current = null
    const arrastrando = drag

    if (arrastrando?.kind === 'draw') {
      const { start, cur } = arrastrando
      const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y)
      if (w > 20 && h > 20) {
        const nueva = {
          id: genId('t'), label: `Zona ${targets.length + 1}`,
          x: Math.min(start.x, cur.x), y: Math.min(start.y, cur.y), w, h,
        }
        onTargetsChange([...targets, nueva])
      }
      setDrag(null)
      return
    }
    setDrag(null)
    if (arrastrando?.kind === 'item' || arrastrando?.kind === 'target') return // fue reposicionar

    if (!info || !info.vacio || herramienta !== 'item') return
    const { x, y } = punto(e)
    if (Math.hypot(x - info.x, y - info.y) > 4) return // arrastre vacío: no crear nada
    const nuevo = {
      id: genId('it'), label: `Item ${items.length + 1}`,
      x: Math.max(0, info.x - ITEM_W / 2), y: Math.max(0, info.y - ITEM_H / 2),
    }
    onItemsChange([...items, nuevo])
  }
  const onMouseLeave = () => { setDrag(null); downInfo.current = null }

  const actualizarItem = (id, patch) => onItemsChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const actualizarTarget = (id, patch) => onTargetsChange(targets.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const eliminarItem = (id) => {
    onItemsChange(items.filter((it) => it.id !== id))
    const next = { ...asignaciones }; delete next[id]; onAsignacionesChange(next)
  }
  const eliminarTarget = (id) => {
    onTargetsChange(targets.filter((t) => t.id !== id))
    const next = {}
    Object.entries(asignaciones).forEach(([k, v]) => { if (v !== id) next[k] = v })
    onAsignacionesChange(next)
  }
  const asignar = (itemId, targetId) => {
    const next = { ...asignaciones }
    if (targetId) next[itemId] = targetId
    else delete next[itemId]
    onAsignacionesChange(next)
  }

  return (
    <div className={styles.canvasEditor}>
      <div className={styles.canvasEditorTools}>
        <button type="button" className={`${styles.tipoChip} ${herramienta === 'item' ? styles.tipoChipActive : ''}`} onClick={() => setHerramienta('item')}>
          <IconPlus /> Agregar elemento
        </button>
        <button type="button" className={`${styles.tipoChip} ${herramienta === 'zona' ? styles.tipoChipActive : ''}`} onClick={() => setHerramienta('zona')}>
          <IconPlus /> Dibujar zona
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvasEditorStage}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
      <p className={styles.canvasEditorHint}>
        {herramienta === 'item'
          ? 'Clic en el lienzo para agregar un elemento arrastrable'
          : 'Clic y arrastra sobre el lienzo para dibujar una zona objetivo'}
        {' · '}arrastra lo existente para reposicionarlo
      </p>

      {items.length === 0 && targets.length === 0 ? (
        <p className={styles.canvasEditorEmpty}>Agrega elementos y zonas usando el lienzo de arriba.</p>
      ) : (
        <div className={styles.canvasEditorList}>
          {items.map((it, i) => (
            <div key={it.id} className={styles.canvasEditorRow}>
              <span className={styles.canvasEditorNum}>{i + 1}</span>
              <input className={styles.input} value={it.label} onChange={(e) => actualizarItem(it.id, { label: e.target.value })} style={{ flex: 1 }} />
              <span className={styles.canvasEditorArrow}>→</span>
              <select
                className={styles.select}
                value={asignaciones[it.id] || ''}
                onChange={(e) => asignar(it.id, e.target.value)}
                style={{ maxWidth: 160 }}
              >
                <option value="">Zona correcta…</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={() => eliminarItem(it.id)} title="Eliminar elemento">
                <IconTrash />
              </button>
            </div>
          ))}
          {targets.map((t) => (
            <div key={t.id} className={styles.canvasEditorRow}>
              <span className={styles.canvasEditorNum} style={{ background: '#fef3c7', color: '#b45309' }}>Z</span>
              <input className={styles.input} value={t.label} onChange={(e) => actualizarTarget(t.id, { label: e.target.value })} style={{ flex: 1 }} />
              <span className={styles.canvasEditorHintInline}>zona objetivo</span>
              <button className={`${styles.btnIcon} ${styles.btnIconDanger}`} onClick={() => eliminarTarget(t.id)} title="Eliminar zona">
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
