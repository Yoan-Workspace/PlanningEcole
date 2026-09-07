export type SchoolId = 'michelis' | 'ndj'
export type Period = 'matin' | 'soir'
export type Weekday = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'

export interface Slot {
  availableParents: string[]
  children: string[]
  accompanying: string | null
}

export type DaySlots = Record<SchoolId, Record<Period, Slot>>

export type WeekPlan = Record<Weekday, DaySlots>

export interface AppState {
  weekStart: string // ISO Monday YYYY-MM-DD
  plans: Record<string, WeekPlan> // keyed by weekStart
}

export function emptySlot(): Slot {
  return { availableParents: [], children: [], accompanying: null }
}

export function emptyDaySlots(): DaySlots {
  return {
    michelis: { matin: emptySlot(), soir: emptySlot() },
    ndj: { matin: emptySlot(), soir: emptySlot() },
  }
}

export function emptyWeekPlan(): WeekPlan {
  return {
    lundi: emptyDaySlots(),
    mardi: emptyDaySlots(),
    mercredi: emptyDaySlots(),
    jeudi: emptyDaySlots(),
    vendredi: emptyDaySlots(),
  }
}
