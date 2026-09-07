import { SCHOOLS } from './constants'

export type SchoolId = 'michelis' | 'ndj'
export type Period = 'matin' | 'soir'
export type Weekday = 'lundi' | 'mardi' | 'jeudi' | 'vendredi'

export interface Slot {
  availableParents: string[]
  children: string[]
  accompanying: string | null
  comment: string
}

export interface DaySlots {
  note: string
  michelis: Record<Period, Slot>
  ndj: Record<Period, Slot>
}

export type WeekPlan = Record<Weekday, DaySlots>

export interface AppState {
  weekStart: string // ISO Monday YYYY-MM-DD
  plans: Record<string, WeekPlan> // keyed by weekStart
  parents: string[]
  updatedAt?: number
  schemaVersion?: number
}

export function schoolChildren(school: SchoolId): string[] {
  return SCHOOLS.find((item) => item.id === school)?.children ?? []
}

export function emptySlot(school: SchoolId): Slot {
  return {
    availableParents: [],
    children: [...schoolChildren(school)],
    accompanying: null,
    comment: '',
  }
}

export function emptyDaySlots(): DaySlots {
  return {
    note: '',
    michelis: { matin: emptySlot('michelis'), soir: emptySlot('michelis') },
    ndj: { matin: emptySlot('ndj'), soir: emptySlot('ndj') },
  }
}

export function emptyWeekPlan(): WeekPlan {
  return {
    lundi: emptyDaySlots(),
    mardi: emptyDaySlots(),
    jeudi: emptyDaySlots(),
    vendredi: emptyDaySlots(),
  }
}
