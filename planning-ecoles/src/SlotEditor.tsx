import { useEffect, useRef, useState } from 'react'
import { PERIODS, SCHOOLS, WEEKDAYS, WEEKDAY_SHORT } from './constants'
import { sameName, withName, withoutName } from './names'
import type { Period, SchoolId, Slot, Weekday } from './types'

interface SlotEditorProps {
  day: Weekday
  dayLabel: string
  school: SchoolId
  period: Period
  slot: Slot
  currentName: string
  thisWeekDays: Weekday[]
  nextWeekDays: Weekday[]
  thisWeekRange: string
  nextWeekRange: string
  onChange: (slot: Slot) => void
  onToggleDay: (weekday: Weekday, weekOffset: 0 | 1, available: boolean) => void
  onClose: () => void
}

function extraDaysSummary(
  thisWeekDays: Weekday[],
  nextWeekDays: Weekday[],
  currentDay: Weekday,
): string | null {
  const extraThis = thisWeekDays.filter((weekday) => weekday !== currentDay)
  if (extraThis.length === 0 && nextWeekDays.length === 0) return null
  const parts: string[] = []
  if (extraThis.length) {
    parts.push(extraThis.map((weekday) => WEEKDAY_SHORT[weekday]).join(', '))
  }
  if (nextWeekDays.length === WEEKDAYS.length) {
    parts.push('toute la suivante')
  } else if (nextWeekDays.length) {
    parts.push(
      `suiv. ${nextWeekDays.map((weekday) => WEEKDAY_SHORT[weekday]).join(', ')}`,
    )
  }
  return parts.join(' · ')
}

function DayPicks({
  label,
  range,
  selected,
  here,
  onToggle,
}: {
  label: string
  range: string
  selected: Weekday[]
  here?: Weekday
  onToggle: (weekday: Weekday, nextOn: boolean) => void
}) {
  return (
    <div className="repeat-box" role="group" aria-label={`${label}, ${range}`}>
      <p className="repeat-week-label">
        {label}
        <span>{range}</span>
      </p>
      <div className="repeat-days">
        {WEEKDAYS.map((weekday) => {
          const on = selected.includes(weekday)
          return (
            <button
              key={weekday}
              type="button"
              className={`repeat-day ${on ? 'on' : ''} ${here === weekday ? 'here' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(weekday, !on)}
            >
              {WEEKDAY_SHORT[weekday]}
              {here === weekday ? <em>ici</em> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SlotEditor({
  day,
  dayLabel,
  school,
  period,
  slot,
  currentName,
  thisWeekDays,
  nextWeekDays,
  thisWeekRange,
  nextWeekRange,
  onChange,
  onToggleDay,
  onClose,
}: SlotEditorProps) {
  const schoolMeta = SCHOOLS.find((s) => s.id === school)!
  const periodLabel = PERIODS.find((p) => p.id === period)!.label
  const isAvailable = slot.availableParents.some((n) => sameName(n, currentName))
  const [comment, setComment] = useState(slot.comment ?? '')
  const [moreDaysOpen, setMoreDaysOpen] = useState(false)
  const commentRef = useRef(comment)
  commentRef.current = comment
  const extraSummary = extraDaysSummary(thisWeekDays, nextWeekDays, day)
  const slotRef = useRef(slot)
  slotRef.current = slot

  useEffect(() => {
    setComment(slot.comment ?? '')
  }, [slot.comment, day, school, period])

  useEffect(() => {
    setMoreDaysOpen(false)
  }, [day, school, period])

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
    const next = {
      ...slotRef.current,
      comment: commentRef.current.trim(),
      ...patch,
    }
    slotRef.current = next
    onChange(next)
  }

  function toggleParent() {
    const current = slotRef.current
    const available = current.availableParents.some((n) => sameName(n, currentName))
    const availableParents = available
      ? withoutName(current.availableParents, currentName)
      : withName(current.availableParents, currentName)
    let accompanying = current.accompanying
    if (accompanying && !availableParents.some((n) => sameName(n, accompanying!))) {
      accompanying = null
    }
    commit({ availableParents, accompanying })
  }

  function toggleThisWeekDay(weekday: Weekday, nextOn: boolean) {
    if (weekday === day) {
      if (nextOn !== isAvailable) toggleParent()
      return
    }
    onToggleDay(weekday, 0, nextOn)
  }

  function toggleChild(name: string) {
    const children = slotRef.current.children.includes(name)
      ? slotRef.current.children.filter((c) => c !== name)
      : [...slotRef.current.children, name]
    commit({ children })
  }

  function setAccompanying(name: string) {
    const current = slotRef.current
    commit({
      accompanying: current.accompanying && sameName(current.accompanying, name) ? null : name,
    })
  }

  function close() {
    commit()
    onClose()
  }

  return (
    <>
      <button type="button" className="editor-backdrop" aria-label="Fermer" onClick={close} />
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
          <button type="button" className="ghost close-btn" onClick={close} aria-label="Fermer">
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

          <div className={`repeat ${moreDaysOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="repeat-summary"
              aria-expanded={moreDaysOpen}
              aria-controls="repeat-panel"
              onClick={() => setMoreDaysOpen((open) => !open)}
            >
              <span className="repeat-summary-copy">
                <strong>Aussi d’autres jours</strong>
                <span>{extraSummary ?? 'Cette semaine et la suivante'}</span>
              </span>
              <span className="repeat-chevron" aria-hidden="true" />
            </button>

            {moreDaysOpen ? (
              <div className="repeat-panel" id="repeat-panel">
                <p className="hint">
                  Même école, même moment. Touche un jour : tu y es proposé. Les
                  enfants se règlent à part.
                </p>
                <DayPicks
                  label="Cette semaine"
                  range={thisWeekRange}
                  selected={thisWeekDays}
                  here={day}
                  onToggle={toggleThisWeekDay}
                />
                <DayPicks
                  label="Semaine suivante"
                  range={nextWeekRange}
                  selected={nextWeekDays}
                  onToggle={(weekday, nextOn) => onToggleDay(weekday, 1, nextOn)}
                />
              </div>
            ) : null}
          </div>
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
