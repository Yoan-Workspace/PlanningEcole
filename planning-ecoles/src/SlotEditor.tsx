import { useEffect, useRef, useState } from 'react'
import { PERIODS, SCHOOLS } from './constants'
import { sameName, withName, withoutName } from './names'
import type { Period, SchoolId, Slot, Weekday } from './types'

interface SlotEditorProps {
  day: Weekday
  dayLabel: string
  school: SchoolId
  period: Period
  slot: Slot
  currentName: string
  onChange: (slot: Slot) => void
  onClose: () => void
}

export function SlotEditor({
  day,
  dayLabel,
  school,
  period,
  slot,
  currentName,
  onChange,
  onClose,
}: SlotEditorProps) {
  const schoolMeta = SCHOOLS.find((s) => s.id === school)!
  const periodLabel = PERIODS.find((p) => p.id === period)!.label
  const isAvailable = slot.availableParents.some((n) => sameName(n, currentName))
  const [comment, setComment] = useState(slot.comment ?? '')
  const commentRef = useRef(comment)
  commentRef.current = comment

  useEffect(() => {
    setComment(slot.comment ?? '')
  }, [slot.comment, day, school, period])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 719px)')
    if (!mobile.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function commit(patch: Partial<Slot> = {}) {
    onChange({
      ...slot,
      comment: commentRef.current.trim(),
      ...patch,
    })
  }

  function toggleParent() {
    const availableParents = isAvailable
      ? withoutName(slot.availableParents, currentName)
      : withName(slot.availableParents, currentName)
    let accompanying = slot.accompanying
    if (accompanying && !availableParents.some((n) => sameName(n, accompanying!))) {
      accompanying = null
    }
    onChange({ ...slot, availableParents, accompanying, comment: commentRef.current.trim() })
  }

  function toggleChild(name: string) {
    const children = slot.children.includes(name)
      ? slot.children.filter((c) => c !== name)
      : [...slot.children, name]
    onChange({ ...slot, children, comment: commentRef.current.trim() })
  }

  function setAccompanying(name: string) {
    onChange({
      ...slot,
      comment: commentRef.current.trim(),
      accompanying: slot.accompanying && sameName(slot.accompanying, name) ? null : name,
    })
  }

  return (
    <>
      <button type="button" className="editor-backdrop" aria-label="Fermer" onClick={onClose} />
      <aside
        className={`editor school-${school}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="editor-handle" aria-hidden="true" />
        <div className="editor-header">
          <div>
            <p className="eyebrow">
              {dayLabel} · {periodLabel}
            </p>
            <h2 id="editor-title">{schoolMeta.name}</h2>
          </div>
          <button type="button" className="ghost close-btn" onClick={onClose} aria-label="Fermer">
            Fermer
          </button>
        </div>

        <section>
          <h3>Ta disponibilité</h3>
          <button
            type="button"
            className={`switch-row ${isAvailable ? 'on' : ''}`}
            role="switch"
            aria-checked={isAvailable}
            onClick={toggleParent}
          >
            <span className="switch-copy">
              <strong>{isAvailable ? 'Tu es disponible' : 'Tu n’es pas disponible'}</strong>
              <span>{isAvailable ? 'Touche pour te retirer' : 'Touche pour te proposer'}</span>
            </span>
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </button>
        </section>

        <section>
          <h3>Quels enfants viennent ?</h3>
          <p className="hint">Tous sont cochés. Décoche seulement celui qui ne vient pas.</p>
          <div className="chip-grid">
            {schoolMeta.children.map((child) => {
              const checked = slot.children.includes(child)
              return (
                <label key={child} className={`chip ${checked ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(child)}
                  />
                  {child}
                </label>
              )
            })}
          </div>
        </section>

        <section>
          <h3>Accompagnant</h3>
          {slot.availableParents.length === 0 ? (
            <p className="hint">Personne n&apos;est encore disponible pour ce trajet.</p>
          ) : (
            <ul className="parent-list">
              {slot.availableParents.map((name) => {
                const isMe = sameName(name, currentName)
                const isEscort = Boolean(slot.accompanying && sameName(slot.accompanying, name))
                return (
                  <li key={name}>
                    <div className="parent-id">
                      <span>{name}</span>
                      {isMe ? <em>toi</em> : null}
                    </div>
                    <div className="parent-actions">
                      <button
                        type="button"
                        className={`pick ${isEscort ? 'on' : ''}`}
                        onClick={() => setAccompanying(name)}
                      >
                        {isEscort ? 'Accompagnant' : 'Choisir'}
                      </button>
                      {isMe ? (
                        <button type="button" className="linkish" onClick={toggleParent}>
                          Me retirer
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h3>Commentaire</h3>
          <p className="hint">Visible par tout le monde, pour ce trajet seulement.</p>
          <textarea
            className="note-field"
            rows={3}
            value={comment}
            placeholder="Ex. Commentaire, note, une info"
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => commit()}
          />
        </section>
      </aside>
    </>
  )
}
