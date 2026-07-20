import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanelResumen } from '../services/adminService'
import styles from './Admin.module.css'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await getPanelResumen()
        setData(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Panel de administración</h1>
          <p className={styles.pageDesc}>Resumen del sistema y accesos rápidos</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <StatCard icon={<IconUsers />} cls={styles.statIconBlue} value={data?.usuarios_total ?? '—'} label="Usuarios totales" />
            <StatCard icon={<IconCheck />} cls={styles.statIconGreen} value={data?.usuarios_activos ?? '—'} label="Usuarios activos" />
            <StatCard icon={<IconClock />} cls={styles.statIconAmber} value={data?.cursos_pendientes ?? '—'} label="Cursos pendientes" />
            <StatCard icon={<IconBook />} cls={styles.statIconIndigo} value={data?.cursos_publicados ?? '—'} label="Cursos publicados" />
            <StatCard icon={<IconShield />} cls={styles.statIconRed} value={data?.auditorias_calificacion ?? '—'} label="Registros auditoría" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
            <QuickCard
              icon={<IconUsers />}
              title="Gestión de usuarios"
              desc="Ver, editar roles y desactivar cuentas"
              onClick={() => navigate('/admin/usuarios')}
            />
            <QuickCard
              icon={<IconClock />}
              title="Aprobación de cursos"
              desc={`${data?.cursos_pendientes || 0} curso(s) esperando revisión`}
              onClick={() => navigate('/admin/cursos')}
              highlight={data?.cursos_pendientes > 0}
            />
            <QuickCard
              icon={<IconShield />}
              title="Auditoría"
              desc="Historial de cambios de calificaciones"
              onClick={() => navigate('/admin/auditoria')}
            />
            <QuickCard
              icon={<IconChart />}
              title="Analíticas"
              desc="Métricas globales del sistema"
              onClick={() => navigate('/admin/analiticas')}
            />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, cls, value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.statIcon} ${cls}`}>{icon}</span>
      <span className={styles.statInfo}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </span>
    </div>
  )
}

function QuickCard({ icon, title, desc, onClick, highlight }) {
  return (
    <button onClick={onClick} style={{
      background: highlight ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : '#fff',
      border: `1.5px solid ${highlight ? '#fde68a' : '#e5e7eb'}`,
      borderRadius: 14, padding: '1.25rem', cursor: 'pointer', textAlign: 'left',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,.04)', transition: 'box-shadow .15s, transform .15s',
    }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = '' }}
    >
      <span style={{ width:36, height:36, borderRadius:9, background:'#eef2ff', color:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
      <span style={{ fontSize:'0.92rem', fontWeight:700, color:'#111827' }}>{title}</span>
      <span style={{ fontSize:'0.78rem', color:'#6b7280' }}>{desc}</span>
    </button>
  )
}

function IconUsers() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconCheck() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IconClock() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IconBook() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function IconShield() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IconChart() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
