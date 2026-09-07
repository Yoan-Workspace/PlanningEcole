import type { SchoolId, Weekday } from './types'

export const WEEKDAYS: Weekday[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
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

/** Code d'accès par défaut — à changer via VITE_ACCESS_CODE */
export const DEFAULT_ACCESS_CODE = 'trajet2026'

export const STORAGE_KEY = 'planning-ecoles-v1'
export const SESSION_NAME_KEY = 'planning-ecoles-prenom'
export const SESSION_AUTH_KEY = 'planning-ecoles-auth'
