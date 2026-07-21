import { useEffect, useRef, useState } from 'react'
import { getDashboard, exportarPDF } from '../services/progresoService'
import styles from './Progreso.module.css'

function fmtTiempo(seg) {
  seg = Math.max(0, Math.floor(seg || 0))
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m`
  return `${seg}s`
}

function gradientFor(i) {
  const g = [
    ['#6366f1','#8b5cf6'],
    ['#3b82f6','#06b6d4'],
    ['#10b981','#34d399'],
    ['#f59e0b','#f97316'],
    ['#ec4899','#a855f7'],
  ]
  const [a,b] = g[i % g.length]
  return `linear-gradient(135deg,${a},${b})`
}

function ProgressRing({ pct, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 100) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#pg)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize="14" fontWeight="700" fill="#111827">{Math.round(pct)}%</text>
    </svg>
  )
}

export default function MiProgreso() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const toastRef = useRef(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await getDashboard()
        setData(data)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportarPDF()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'dashboard-progreso.pdf'; a.click()
      URL.revokeObjectURL(url)
      showToast('PDF descargado', 'ok')
    } catch {
      showToast('No se pudo generar el PDF', 'err')
    } finally {
      setExporting(false)
    }
  }

  const showToast = (msg, type) => {
    const el = toastRef.current
    if (!el) return
    el.textContent = msg
    el.className = `${styles.toast} ${type === 'ok' ? styles.toastOk : styles.toastErr}`
    el.style.display = 'block'
    clearTimeout(el._t)
    el._t = setTimeout(() => { if (el) el.style.display = 'none' }, 3000)
  }

  const res = data?.resumen || {}
  const cursos = data?.cursos || []
  const evals = data?.evaluaciones || []

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mi Progreso</h1>
          <p className={styles.pageDesc}>Métricas de aprendizaje y desempeño general</p>
        </div>
        <button className={styles.btnPrimary} onClick={handleExport} disabled={exporting || loading}>
          <IconDownload />
          {exporting ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : !data ? (
        <div className={styles.stateWrap}>
          <div className={styles.stateIcon}><IconChart /></div>
          <p className={styles.stateTitle}>Sin datos de progreso</p>
          <p className={styles.stateDesc}>Inscríbete a un curso y comienza a aprender para ver tus métricas.</p>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className={styles.heroCard}>
            <div className={styles.heroInfo}>
              <p className={styles.heroTitle}>Progreso general</p>
              <p className={styles.heroPct}>{Math.round(res.porcentaje_completado)}%</p>
              <p className={styles.heroSub}>{res.lecciones_completadas} de {res.lecciones_totales} lecciones completadas</p>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{res.cursos_inscritos}</span>
                <span className={styles.heroStatLbl}>Cursos</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{fmtTiempo(res.tiempo_segundos)}</span>
                <span className={styles.heroStatLbl}>Tiempo total</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{Math.round(res.desempeno?.promedio_puntaje || 0)}%</span>
                <span className={styles.heroStatLbl}>Desempeño</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{res.desempeno?.tasa_aprobacion_pct || 0}%</span>
                <span className={styles.heroStatLbl}>Aprobación</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <StatCard icon={<IconBook />} cls={styles.statIconBlue} value={res.cursos_inscritos} label="Cursos inscritos" />
            <StatCard icon={<IconCheck />} cls={styles.statIconGreen} value={res.lecciones_completadas} label="Lecciones completadas" />
            <StatCard icon={<IconClock />} cls={styles.statIconAmber} value={fmtTiempo(res.tiempo_segundos)} label="Tiempo de estudio" />
            <StatCard icon={<IconClipboard />} cls={styles.statIconIndigo} value={res.desempeno?.intentos || 0} label="Evaluaciones rendidas" />
          </div>

          <div className={styles.twoCol}>
            {/* Cursos */}
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Progreso por curso</h2>
              </div>
              {cursos.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.84rem' }}>
                  Sin cursos inscritos
                </div>
              ) : cursos.map((c, i) => (
                <div key={c.curso_slug || i} className={styles.courseRow}>
                  <div className={styles.courseRowTop}>
                    <span className={styles.courseTitle}>{c.curso_titulo}</span>
                    <span className={styles.coursePct}>{Math.round(c.porcentaje_completado)}%</span>
                  </div>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${c.porcentaje_completado}%`, background: gradientFor(i) }} />
                  </div>
                  <div className={styles.courseMeta}>
                    <span>{fmtTiempo(c.tiempo_segundos)}</span>
                    <span>Desempeño: {Math.round(c.desempeno_promedio || 0)}%</span>
                    <span style={{ textTransform:'capitalize' }}>{c.estado_inscripcion}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluaciones */}
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Evaluaciones</h2>
              </div>
              {evals.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.84rem' }}>
                  Sin evaluaciones rendidas
                </div>
              ) : evals.map((e, i) => (
                <div key={i} className={styles.evalRow}>
                  <div>
                    <div className={styles.evalName}>{e.evaluacion_titulo}</div>
                    <div className={styles.evalMeta}>
                      <span>{e.curso_titulo}</span>
                      <span>{new Date(e.finalizado_en).toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>
                  <span className={`${styles.scorePill} ${e.aprobado ? styles.scoreOk : styles.scoreFail}`}>
                    {Math.round(Number(e.puntaje))}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div ref={toastRef} style={{ display: 'none' }} />
    </div>
  )
}

function StatCard({ icon, cls, value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.statIcon} ${cls}`}>{icon}</span>
      <span className={styles.statInfo}>
        <span className={styles.statValue}>{value ?? '—'}</span>
        <span className={styles.statLabel}>{label}</span>
      </span>
    </div>
  )
}

function IconDownload() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function IconChart() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function IconBook() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
}
function IconCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconClock() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconClipboard() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
}
