import { PERIODS, SCHOOLS, WEEKDAYS } from './constants'
import { sameName } from './names'
import { formatDayLabel } from './storage'
import type { Period, SchoolId, Weekday, WeekPlan } from './types'

interface WeekBoardProps {
  weekStart: string
  plan: WeekPlan
  selected: { day: Weekday; school: SchoolId; period: Period } | null
  currentName: string
  onSelect: (day: Weekday, school: SchoolId, period: Period) => void
  onDayNote: (day: Weekday, note: string) => void
}

function kidsNote(children: string[], all: string[]): string | null {
  if (children.length === 0) return 'Aucun enfant'
  const missing = all.filter((child) => !children.includes(child))
  if (missing.length === 0) return null
  return `Sans ${missing.join(', ')}`
}

export function WeekBoard({
  weekStart,
  plan,
  selected,
  currentName,
  onSelect,
  onDayNote,
}: WeekBoardProps) {
  return (
    <div className="board">
      {WEEKDAYS.map((day) => {
        const dayLabel = formatDayLabel(weekStart, day)
        return (
          <section key={day} className="day-column">
            <h2>{dayLabel}</h2>
            <label className="day-note-wrap">
              <span className="sr-only">Note du {dayLabel}</span>
              <input
                className="day-note"
                value={plan[day].note}
                placeholder="Note du jour, un commentaire, une info"
                onChange={(e) => onDayNote(day, e.target.value)}
              />
            </label>
            {SCHOOLS.map((school) => (
              <div key={school.id} className={`school-block school-${school.id}`}>
                <header className="school-head">
                  <h3>{school.name}</h3>
                  <p className="school-kids">{school.children.join(' · ')}</p>
                </header>
                <div className="period-row">
                  {PERIODS.map((period) => {
                    const slot = plan[day][school.id][period.id]
                    const escort = slot.accompanying
                    const parents = slot.availableParents.length
                    const mine = slot.availableParents.some((n) => sameName(n, currentName))
                    const isActive =
                      selected?.day === day &&
                      selected?.school === school.id &&
                      selected?.period === period.id
                    const status = escort ? 'ready' : parents ? 'waiting' : 'empty'
                    const note = kidsNote(slot.children, school.children)
                    return (
                      <button
                        key={period.id}
                        type="button"
                        className={`slot-btn ${status} ${isActive ? 'active' : ''} ${mine ? 'mine' : ''}`}
                        onClick={() => onSelect(day, school.id, period.id)}
                      >
                        <span className="slot-period">{period.label}</span>
                        <span className={`slot-driver ${status}`}>
                          {escort ?? (parents ? 'À attribuer' : 'Personne')}
                        </span>
                        {slot.comment ? <span className="slot-comment">{slot.comment}</span> : null}
                        {note ? <span className="slot-note">{note}</span> : null}
                        {mine && !escort ? <span className="slot-me">Tu es dispo</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
