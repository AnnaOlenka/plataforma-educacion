import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { verificarPorUUID, verificarPorHash } from '../services/certificadosService'
import styles from './Certificados.module.css'

export default function VerificarCertificado() {
  const { codigo } = useParams()

  // Modo directo: si hay UUID en la URL, verificar automáticamente
  const [autoData, setAutoData] = useState(null)
  const [autoLoading, setAutoLoading] = useState(!!codigo)

  // Modo manual: buscar por hash
  const [hashInput, setHashInput] = useState('')
  const [manualData, setManualData] = useState(null)
  const [manualLoading, setManualLoading] = useState(false)

  useEffect(() => {
    if (!codigo) return
    ;(async () => {
      try {
        const { data } = await verificarPorUUID(codigo)
        setAutoData(data)
      } catch {
        setAutoData({ valido: false, mensaje: 'No se encontró el certificado' })
      } finally {
        setAutoLoading(false)
      }
    })()
  }, [codigo])

  const handleManual = async (e) => {
    e.preventDefault()
    if (!hashInput.trim()) return
    setManualLoading(true)
    try {
      const payload = hashInput.includes('-') || hashInput.length > 12
        ? { codigo: hashInput.trim() }
        : { hash_corto: hashInput.trim() }
      const { data } = await verificarPorHash(payload)
      setManualData(data)
    } catch {
      setManualData({ valido: false, mensaje: 'Certificado no encontrado' })
    } finally {
      setManualLoading(false)
    }
  }

  const result = autoData || manualData

  return (
    <div className={styles.verifyPage}>
      <div className={styles.verifyCard}>
        <h1 className={styles.verifyTitle}>Verificación de certificado</h1>
        <p className={styles.verifyDesc}>
          Verifica la autenticidad de un certificado EduPath. Introduce el código UUID o el hash corto.
        </p>

        {!codigo && (
          <form onSubmit={handleManual} className={styles.searchRow}>
            <input
              className={styles.input}
              placeholder="UUID del certificado o hash corto (ej: A3F9B2C1)"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
            />
            <button className={styles.btnPrimary} type="submit" disabled={manualLoading}>
              {manualLoading ? 'Buscando…' : <><IconSearch /> Verificar</>}
            </button>
          </form>
        )}

        {(autoLoading || manualLoading) && (
          <div className={styles.stateWrap}><div className={styles.spinner} /></div>
        )}

        {result && !autoLoading && !manualLoading && (
          <ResultPanel data={result} />
        )}
      </div>
    </div>
  )
}

function ResultPanel({ data }) {
  const cls = data.valido ? styles.resultValid : styles.resultInvalid
  const emitido = data.emitido_en
    ? new Date(data.emitido_en).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className={`${styles.resultBox} ${cls}`}>
      <div className={styles.resultTitle}>
        {data.valido ? <IconCheckCircle /> : <IconXCircle />}
        {data.mensaje}
      </div>

      {data.estudiante && <Row label="Estudiante" val={data.estudiante} />}
      {data.curso && <Row label="Curso" val={data.curso} />}
      {emitido && <Row label="Emitido el" val={emitido} />}
      {data.algoritmo && <Row label="Algoritmo" val={data.algoritmo} />}
      {data.hash_corto && <Row label="Hash corto" val={<code>{data.hash_corto}</code>} />}
      {data.firma_integra !== undefined && (
        <Row label="Firma íntegra" val={data.firma_integra ? 'Sí' : 'No'} />
      )}
      {data.revocado !== undefined && (
        <Row label="Revocado" val={data.revocado ? 'Sí' : 'No'} />
      )}

      {data.url_qr && (
        <img
          src={data.url_qr}
          alt="QR de verificación"
          className={styles.qrImg}
        />
      )}
    </div>
  )
}

function Row({ label, val }) {
  return (
    <div className={styles.resultRow}>
      <span className={styles.resultKey}>{label}</span>
      <span className={styles.resultVal}>{val}</span>
    </div>
  )
}

function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconCheckCircle() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
function IconXCircle() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
}
