import { PERIODS, SCHOOLS, WEEKDAY_LABELS } from './constants'
import type { Period, SchoolId, Slot, Weekday } from './types'

interface SlotEditorProps {
  day: Weekday
  school: SchoolId
  period: Period
  slot: Slot
  currentName: string
  onChange: (slot: Slot) => void
  onClose: () => void
}

export function SlotEditor({
  day,
  school,
  period,
  slot,
  currentName,
  onChange,
  onClose,
}: SlotEditorProps) {
  const schoolMeta = SCHOOLS.find((s) => s.id === school)!
  const periodLabel = PERIODS.find((p) => p.id === period)!.label
  const isAvailable = slot.availableParents.includes(currentName)

  function toggleParent() {
    const availableParents = isAvailable
      ? slot.availableParents.filter((n) => n !== currentName)
      : [...slot.availableParents, currentName]
    let accompanying = slot.accompanying
    if (accompanying && !availableParents.includes(accompanying)) {
      accompanying = null
    }
    onChange({ ...slot, availableParents, accompanying })
  }

  function toggleChild(name: string) {
    const children = slot.children.includes(name)
      ? slot.children.filter((c) => c !== name)
      : [...slot.children, name]
    onChange({ ...slot, children })
  }

  function setAccompanying(name: string) {
    onChange({
      ...slot,
      accompanying: slot.accompanying === name ? null : name,
    })
  }

  return (
    <>
      <button type="button" className="editor-backdrop" aria-label="Fermer" onClick={onClose} />
      <aside className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div className="editor-handle" aria-hidden="true" />
      <div className="editor-header">
        <div>
          <p className="eyebrow">
            {WEEKDAY_LABELS[day]} · {periodLabel}
          </p>
          <h2 id="editor-title">{schoolMeta.name}</h2>
        </div>
        <button type="button" className="ghost" onClick={onClose} aria-label="Fermer">
          Fermer
        </button>
      </div>

      <section>
        <h3>Ta disponibilité</h3>
        <p className="hint">Connecté en tant que {currentName}</p>
        <button
          type="button"
          className={`toggle ${isAvailable ? 'on' : ''}`}
          onClick={toggleParent}
        >
          {isAvailable ? 'Je suis disponible' : 'Me marquer disponible'}
        </button>
      </section>

      <section>
        <h3>Enfants du trajet</h3>
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
        <h3>Parents disponibles</h3>
        {slot.availableParents.length === 0 ? (
          <p className="hint">Personne n&apos;est encore marqué disponible.</p>
        ) : (
          <ul className="parent-list">
            {slot.availableParents.map((name) => (
              <li key={name}>
                <span>{name}</span>
                <button
                  type="button"
                  className={`pick ${slot.accompanying === name ? 'on' : ''}`}
                  onClick={() => setAccompanying(name)}
                >
                  {slot.accompanying === name ? 'Accompagne' : 'Choisir'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">
          Choisis qui accompagne les enfants parmi les parents disponibles.
        </p>
      </section>
    </aside>
    </>
  )
}
