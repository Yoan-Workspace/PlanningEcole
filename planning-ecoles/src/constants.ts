import type { SchoolId, Weekday } from './types'

export const WEEKDAYS: Weekday[] = ['lundi', 'mardi', 'jeudi', 'vendredi']

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
}

/** Jours depuis le lundi (weekStart). Pas de mercredi. */
export const WEEKDAY_OFFSET: Record<Weekday, number> = {
  lundi: 0,
  mardi: 1,
  jeudi: 3,
  vendredi: 4,
}

export const SCHOOLS: {
  id: SchoolId
  name: string
  children: string[]
}[] = [
  {
    id: 'michelis',
    name: 'École Michelis',
    children: ['Naël', 'Emrys', 'Baptiste'],
  },
  {
    id: 'ndj',
    name: 'NDJ',
    children: ['Elio', 'Jules', 'Lovan'],
  },
]

export const PERIODS = [
  { id: 'matin' as const, label: 'Matin' },
  { id: 'soir' as const, label: 'Soir' },
]

export const DEFAULT_PARENTS = [
  'Christophe',
  'Camille',
  'Quentin',
  'Mélaine',
  'Yoan',
  'Anne-Sophie',
]

export const STORAGE_KEY = 'planning-ecoles-v1'
export const SESSION_NAME_KEY = 'planning-ecoles-prenom'
export const SESSION_WEEK_KEY = 'planning-ecoles-semaine'
