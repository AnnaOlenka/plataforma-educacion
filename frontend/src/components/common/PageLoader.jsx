import styles from './PageLoader.module.css'

export default function PageLoader({ text = 'Cargando módulo...' }) {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.spinnerWrapper}>
        <div className={styles.spinner} />
        <span className={styles.logoBadge}>E</span>
      </div>
      <p className={styles.loadingText}>{text}</p>
    </div>
  )
}
