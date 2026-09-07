import { PERIODS, SCHOOLS, WEEKDAY_LABELS, WEEKDAYS } from './constants'
import type { Period, SchoolId, Weekday, WeekPlan } from './types'

interface WeekBoardProps {
  plan: WeekPlan
  selected: { day: Weekday; school: SchoolId; period: Period } | null
  onSelect: (day: Weekday, school: SchoolId, period: Period) => void
}

function slotSummary(plan: WeekPlan, day: Weekday, school: SchoolId, period: Period) {
  const slot = plan[day][school][period]
  const parents = slot.availableParents.length
  const kids = slot.children.length
  const escort = slot.accompanying
  return { parents, kids, escort }
}

export function WeekBoard({ plan, selected, onSelect }: WeekBoardProps) {
  return (
    <div className="board">
      {WEEKDAYS.map((day) => (
        <section key={day} className="day-column">
          <h2>{WEEKDAY_LABELS[day]}</h2>
          {SCHOOLS.map((school) => (
            <div key={school.id} className="school-block">
              <h3>{school.name}</h3>
              <div className="period-row">
                {PERIODS.map((period) => {
                  const summary = slotSummary(plan, day, school.id, period.id)
                  const isActive =
                    selected?.day === day &&
                    selected?.school === school.id &&
                    selected?.period === period.id
                  return (
                    <button
                      key={period.id}
                      type="button"
                      className={`slot-btn ${isActive ? 'active' : ''} ${summary.parents || summary.kids ? 'filled' : ''}`}
                      onClick={() => onSelect(day, school.id, period.id)}
                    >
                      <span className="slot-period">{period.label}</span>
                      <span className="slot-meta">
                        {summary.kids > 0 ? `${summary.kids} enf.` : '—'}
                        {' · '}
                        {summary.parents > 0 ? `${summary.parents} dispo` : 'personne'}
                      </span>
                      {summary.escort ? (
                        <span className="slot-escort">→ {summary.escort}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
