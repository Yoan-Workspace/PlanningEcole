import { useEffect } from 'react'
import { TUTORIAL_SEEN_KEY } from './constants'

interface HowItWorksProps {
  open: boolean
  onClose: () => void
}

function markSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function HowItWorks({ open, onClose }: HowItWorksProps) {
  useEffect(() => {
    if (!open) return
    markSeen()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="editor-backdrop tuto-backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
      <aside className="editor tuto" role="dialog" aria-modal="true" aria-labelledby="tuto-title">
        <div className="editor-handle" aria-hidden="true" />
        <div className="editor-header">
          <div>
            <p className="eyebrow">Guide</p>
            <h2 id="tuto-title">Comment ça marche</h2>
          </div>
          <button type="button" className="ghost close-btn" onClick={onClose} aria-label="Fermer">
            Fermer
          </button>
        </div>

        <ol className="tuto-steps">
          <li>
            <div>
              <strong>Touche un créneau</strong>
              <p>D’abord l’école — Michelis ou NDJ — puis matin ou soir.</p>
            </div>
            <div className="slot-btn empty tuto-slot" aria-hidden="true">
              <span className="slot-period">Matin</span>
              <span className="slot-driver empty">Personne</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Propose-toi</strong>
              <p>Dis que tu peux y aller. Le créneau passe en attente.</p>
            </div>
            <div className="slot-btn waiting tuto-slot" aria-hidden="true">
              <span className="slot-period">Matin</span>
              <span className="slot-driver waiting">À attribuer</span>
              <span className="slot-me">Tu es dispo</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Choisis l’accompagnant</strong>
              <p>Un prénom en vert : c’est réglé.</p>
            </div>
            <div className="slot-btn ready tuto-slot" aria-hidden="true">
              <span className="slot-period">Matin</span>
              <span className="slot-driver ready">Camille</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Les enfants</strong>
              <p>Tous sont dans le trajet. Décoche seulement si l’un ne vient pas.</p>
            </div>
          </li>
        </ol>

        <button type="button" onClick={onClose}>
          J’ai compris
        </button>
      </aside>
    </>
  )
}
