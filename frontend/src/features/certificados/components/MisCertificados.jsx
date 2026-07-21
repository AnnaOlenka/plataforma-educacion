import { useEffect, useRef, useState } from 'react'
import { getMisCertificados, emitirCertificado, getCertificadoPDF } from '../services/certificadosService'
import { getDashboard } from '../../progreso/services/progresoService'
import styles from './Certificados.module.css'

const GRADIENTS = [
  ['#6366f1','#8b5cf6'],
  ['#3b82f6','#06b6d4'],
  ['#10b981','#34d399'],
  ['#f59e0b','#f97316'],
  ['#ec4899','#a855f7'],
]

function gradientFor(i) {
  const [a,b] = GRADIENTS[i % GRADIENTS.length]
  return `linear-gradient(135deg,${a},${b})`
}

export default function MisCertificados() {
  const [certs, setCerts] = useState([])
  const [elegibles, setElegibles] = useState([])   // cursos al 100% sin cert
  const [loading, setLoading] = useState(true)
  const [emitiendo, setEmitiendo] = useState({})
  const [descargando, setDescargando] = useState({})
  const toastRef = useRef(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const [certRes, dashRes] = await Promise.all([
        getMisCertificados(),
        getDashboard(),
      ])
      const lista = Array.isArray(certRes.data) ? certRes.data : (certRes.data.results || [])
      setCerts(lista)

      // cursos al 100% que aún no tienen certificado
      const slugsCertificados = new Set(lista.map(c => c.curso_slug || c.curso?.slug))
      const cursosCompletos = (dashRes.data?.cursos || []).filter(
        c => Math.round(c.porcentaje_completado) >= 100 && !slugsCertificados.has(c.curso_slug)
      )
      setElegibles(cursosCompletos)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg, type = 'ok') => {
    const el = toastRef.current
    if (!el) return
    el.textContent = msg
    el.className = `${styles.toast} ${type === 'ok' ? styles.toastOk : styles.toastErr}`
    el.style.display = 'block'
    clearTimeout(el._t)
    el._t = setTimeout(() => { if (el) el.style.display = 'none' }, 3500)
  }

  const handleEmitir = async (slug) => {
    setEmitiendo(prev => ({ ...prev, [slug]: true }))
    try {
      await emitirCertificado(slug)
      showToast('Certificado emitido correctamente')
      await cargar()
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo emitir el certificado'
      showToast(msg, 'err')
    } finally {
      setEmitiendo(prev => ({ ...prev, [slug]: false }))
    }
  }

  const handlePDF = async (cert) => {
    setDescargando(prev => ({ ...prev, [cert.codigo]: true }))
    try {
      const res = await getCertificadoPDF(cert.codigo)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificado-${cert.codigo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      showToast('PDF descargado')
    } catch {
      showToast('No se pudo descargar el PDF', 'err')
    } finally {
      setDescargando(prev => ({ ...prev, [cert.codigo]: false }))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mis Certificados</h1>
          <p className={styles.pageDesc}>Certificados digitales con verificación HMAC-SHA256</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateWrap}><div className={styles.spinner} /></div>
      ) : (
        <>
          {/* Cursos listos para emitir */}
          {elegibles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                Listos para certificar
              </h2>
              <div className={styles.grid}>
                {elegibles.map((c, i) => (
                  <div key={c.curso_slug || i} className={styles.certCard}>
                    <div className={styles.certBanner} style={{ background: gradientFor(i + certs.length) }}>
                      <IconAwardLg />
                    </div>
                    <div className={styles.certBody}>
                      <h3 className={styles.certTitle}>{c.curso_titulo}</h3>
                      <p className={styles.certDate}>Completado al 100% — pendiente de emisión</p>
                      <div className={styles.certActions}>
                        <button
                          className={styles.btnPrimary}
                          onClick={() => handleEmitir(c.curso_slug)}
                          disabled={emitiendo[c.curso_slug]}
                        >
                          <IconAward />
                          {emitiendo[c.curso_slug] ? 'Emitiendo…' : 'Obtener certificado'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificados emitidos */}
          {certs.length === 0 && elegibles.length === 0 ? (
            <div className={styles.stateWrap}>
              <div className={styles.stateIcon}><IconAward /></div>
              <p className={styles.stateTitle}>Sin certificados aún</p>
              <p className={styles.stateDesc}>Completa un curso al 100% para obtener tu certificado digital.</p>
            </div>
          ) : certs.length > 0 && (
            <>
              {elegibles.length > 0 && (
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                  Certificados emitidos
                </h2>
              )}
              <div className={styles.grid}>
                {certs.map((cert, i) => (
                  <CertCard
                    key={cert.codigo}
                    cert={cert}
                    gradient={gradientFor(i)}
                    descargando={descargando[cert.codigo]}
                    onPDF={() => handlePDF(cert)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div ref={toastRef} style={{ display: 'none' }} />
    </div>
  )
}

function CertCard({ cert, gradient, descargando, onPDF }) {
  const emitido = new Date(cert.emitido_en).toLocaleDateString('es-PE', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const verifyUrl = `/verificar/${cert.codigo}`

  return (
    <div className={styles.certCard}>
      <div className={styles.certBanner} style={{ background: gradient }}>
        <IconAwardLg />
      </div>
      <div className={styles.certBody}>
        <h3 className={styles.certTitle}>{cert.curso_titulo || cert.curso?.titulo}</h3>
        <p className={styles.certDate}>Emitido el {emitido}</p>

        <div className={styles.hashBox}>
          <span className={styles.hashLabel}>Hash</span>
          <span className={styles.hashValue}>{cert.firma_hmac}</span>
          <span className={styles.hashShort}>{cert.hash_corto}</span>
        </div>

        <div className={styles.certActions}>
          <button
            className={styles.btnPrimary}
            onClick={onPDF}
            disabled={descargando}
          >
            <IconDownload />
            {descargando ? 'Descargando…' : 'Descargar PDF'}
          </button>
          <a className={styles.btnGhost} href={verifyUrl} target="_blank" rel="noreferrer">
            <IconShield />
            Verificar
          </a>
        </div>
      </div>
    </div>
  )
}

function IconAward() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
}
function IconAwardLg() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
}
function IconDownload() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function IconShield() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
