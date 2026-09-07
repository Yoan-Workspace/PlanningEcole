import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { STORAGE_KEY } from './constants'
import {
  emptySlot,
  emptyWeekPlan,
  type AppState,
  type DaySlots,
  type WeekPlan,
} from './types'

let cloudEnabled = false

/** Migre l'ancien libellé interne `apresmidi` → `soir` */
function migrateDaySlots(
  raw: DaySlots & { michelis?: Record<string, unknown>; ndj?: Record<string, unknown> },
): DaySlots {
  const migrateSchool = (school: Record<string, unknown> | undefined) => {
    const matin = (school?.matin as DaySlots['michelis']['matin']) ?? emptySlot()
    const soir =
      (school?.soir as DaySlots['michelis']['soir']) ??
      (school?.apresmidi as DaySlots['michelis']['soir']) ??
      emptySlot()
    return { matin, soir }
  }
  return {
    michelis: migrateSchool(raw?.michelis as Record<string, unknown>),
    ndj: migrateSchool(raw?.ndj as Record<string, unknown>),
  }
}

function migrateState(state: AppState): AppState {
  const plans: AppState['plans'] = {}
  for (const [week, plan] of Object.entries(state.plans ?? {})) {
    const next = emptyWeekPlan()
    for (const day of Object.keys(next) as (keyof WeekPlan)[]) {
      next[day] = migrateDaySlots((plan?.[day] ?? emptyWeekPlan()[day]) as DaySlots)
    }
    plans[week] = next
  }
  return { ...state, plans }
}

export function isCloudSyncEnabled(): boolean {
  return cloudEnabled
}

export function getMonday(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function formatWeekLabel(weekStart: string): string {
  const start = parseISO(weekStart)
  const end = addDays(start, 4)
  return `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`
}

export function shiftWeek(weekStart: string, delta: number): string {
  return format(addDays(parseISO(weekStart), delta * 7), 'yyyy-MM-dd')
}

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrateState(JSON.parse(raw) as AppState)
  } catch {
    /* ignore */
  }
  const weekStart = getMonday()
  return { weekStart, plans: { [weekStart]: emptyWeekPlan() } }
}

function saveLocal(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export async function loadState(): Promise<AppState> {
  try {
    const res = await fetch('/api/planning', { credentials: 'include' })
    if (res.ok) {
      const data = (await res.json()) as { persisted?: boolean; state?: AppState | null }
      cloudEnabled = Boolean(data.persisted)
      if (data.state) {
        const remote = migrateState(data.state)
        saveLocal(remote)
        return remote
      }
    } else {
      cloudEnabled = false
    }
  } catch {
    cloudEnabled = false
  }
  return loadLocal()
}

export async function saveState(state: AppState): Promise<void> {
  saveLocal(state)
  if (!cloudEnabled) return
  const res = await fetch('/api/planning', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  if (!res.ok) {
    throw new Error('save_failed')
  }
}

export function ensureWeek(state: AppState, weekStart: string): WeekPlan {
  if (!state.plans[weekStart]) {
    state.plans[weekStart] = emptyWeekPlan()
  }
  return state.plans[weekStart]
}

export function subscribeToCloud(onChange: (state: AppState) => void): () => void {
  const id = window.setInterval(() => {
    void (async () => {
      try {
        const res = await fetch('/api/planning', { credentials: 'include' })
        if (!res.ok) return
        const data = (await res.json()) as { persisted?: boolean; state?: AppState | null }
        if (!data.persisted || !data.state) return
        const remote = migrateState(data.state)
        saveLocal(remote)
        onChange(remote)
      } catch {
        /* ignore */
      }
    })()
  }, 8000)
  return () => window.clearInterval(id)
}
