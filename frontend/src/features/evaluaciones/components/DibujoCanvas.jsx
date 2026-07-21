import { useRef, useEffect, useState, useCallback } from 'react'

export default function DibujoCanvas({ value, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const currentStroke = useRef([])
  const [strokes, setStrokes] = useState(value || [])
  const [color, setColor] = useState('#111827')
  const [size, setSize] = useState(3)

  // Redraw all strokes
  const redraw = useCallback((list) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    list.forEach((s) => {
      if (!s.points?.length) return
      ctx.beginPath()
      ctx.strokeStyle = s.color || '#111827'
      ctx.lineWidth = s.width || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      s.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.stroke()
    })
  }, [])

  useEffect(() => { redraw(strokes) }, [strokes, redraw])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const onStart = (e) => {
    e.preventDefault()
    drawing.current = true
    currentStroke.current = [getPos(e, canvasRef.current)]
  }

  const onMove = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const pt = getPos(e, canvasRef.current)
    currentStroke.current.push(pt)
    const ctx = canvasRef.current.getContext('2d')
    const pts = currentStroke.current
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.stroke()
  }

  const onEnd = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    drawing.current = false
    if (currentStroke.current.length < 2) return
    const newStroke = { points: currentStroke.current, color, width: size }
    const next = [...strokes, newStroke]
    setStrokes(next)
    onChange(next)
    currentStroke.current = []
  }

  const undo = () => {
    const next = strokes.slice(0, -1)
    setStrokes(next)
    onChange(next)
    redraw(next)
  }

  const clear = () => {
    setStrokes([])
    onChange([])
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const COLORS = ['#111827', '#ef4444', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#ffffff']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c,
                border: color === c ? '2.5px solid #6366f1' : '2px solid #e5e7eb',
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {[2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: s + 16, height: s + 16, borderRadius: '50%', background: '#374151',
                border: size === s ? '2px solid #6366f1' : '2px solid #e5e7eb',
                cursor: 'pointer', padding: 0,
              }}
            />
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          <button onClick={undo} disabled={strokes.length === 0} style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>↩ Deshacer</button>
          <button onClick={clear} disabled={strokes.length === 0} style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#ef4444' }}>Limpiar</button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={320}
        style={{ width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'crosshair', touchAction: 'none' }}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      />
      {strokes.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af', marginTop: -4 }}>
          Haz clic y arrastra para dibujar
        </p>
      )}
    </div>
  )
}
