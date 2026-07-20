import { useCallback, useState } from 'react'
import styles from '../components/Cursos.module.css'

/** Toast minimalista: useToast() → { toast, notify(msg, tipo) }. */
export default function useToast() {
  const [state, setState] = useState(null)

  const notify = useCallback((mensaje, tipo = 'success') => {
    setState({ mensaje, tipo })
    setTimeout(() => setState(null), 2800)
  }, [])

  const toast = state ? (
    <div
      className={`${styles.toast} ${
        state.tipo === 'error' ? styles.toastError : styles.toastSuccess
      }`}
      role="status"
    >
      {state.mensaje}
    </div>
  ) : null

  return { toast, notify }
}
