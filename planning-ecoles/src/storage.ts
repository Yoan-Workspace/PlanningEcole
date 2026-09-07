import { addDays, format, getISOWeek, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DEFAULT_PARENTS, STORAGE_KEY, WEEKDAY_LABELS, WEEKDAY_OFFSET } from './constants'
import { sameName, withoutName } from './names'
import {
  emptySlot,
  emptyWeekPlan,
  type AppState,
  type DaySlots,
  type SchoolId,
  type Slot,
  type WeekPlan,
  type Weekday,
} from './types'

let cloudEnabled = false

function hydrateSlot(
  raw: Slot | undefined,
  school: SchoolId,
  fillEmptyChildren: boolean,
): Slot {
  const fallback = emptySlot(school)
  if (!raw) return fallback
  const hasList = Array.isArray(raw.children)
  const children =
    hasList && (raw.children.length > 0 || !fillEmptyChildren)
      ? raw.children
      : fallback.children
  return {
    availableParents: raw.availableParents ?? [],
    children,
    accompanying: raw.accompanying ?? null,
    comment: typeof raw.comment === 'string' ? raw.comment : '',
  }
}

/** Migre l'ancien libellé interne `apresmidi` → `soir` et coche tous les enfants par défaut. */
function migrateDaySlots(
  raw: DaySlots & { michelis?: Record<string, unknown>; ndj?: Record<string, unknown> },
  fillEmptyChildren: boolean,
): DaySlots {
  const migrateSchool = (school: SchoolId, data: Record<string, unknown> | undefined) => {
    const matin = hydrateSlot(data?.matin as Slot | undefined, school, fillEmptyChildren)
    const soir = hydrateSlot(
      (data?.soir as Slot | undefined) ?? (data?.apresmidi as Slot | undefined),
      school,
      fillEmptyChildren,
    )
    return { matin, soir }
  }
  return {
    note: typeof raw.note === 'string' ? raw.note : '',
    michelis: migrateSchool('michelis', raw?.michelis as Record<string, unknown>),
    ndj: migrateSchool('ndj', raw?.ndj as Record<string, unknown>),
  }
}

function migrateState(state: AppState): AppState {
  const fillEmptyChildren = (state.schemaVersion ?? 0) < 2
  const plans: AppState['plans'] = {}
  for (const [week, plan] of Object.entries(state.plans ?? {})) {
    const next = emptyWeekPlan()
    for (const day of Object.keys(next) as (keyof WeekPlan)[]) {
      next[day] = migrateDaySlots(
        (plan?.[day] ?? emptyWeekPlan()[day]) as DaySlots,
        fillEmptyChildren,
      )
    }
    plans[week] = next
  }
  return { ...state, plans, parents: resolveParents(state.parents), schemaVersion: 2 }
}

function resolveParents(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PARENTS]
  return raw
}

export function isCloudSyncEnabled(): boolean {
  return cloudEnabled
}

export function getMonday(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function getWeekNumber(weekStart: string): number {
  return getISOWeek(parseISO(weekStart))
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISO(weekStart)
  const end = addDays(start, 4)
  return `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`
}

export function formatDayLabel(weekStart: string, day: Weekday): string {
  const date = addDays(parseISO(weekStart), WEEKDAY_OFFSET[day])
  return `${WEEKDAY_LABELS[day]} ${format(date, 'dd')}`
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
  return { weekStart, plans: { [weekStart]: emptyWeekPlan() }, parents: [...DEFAULT_PARENTS] }
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

export function removeParentFromState(state: AppState, name: string): AppState {
  const next: AppState = structuredClone(state)
  next.parents = withoutName(next.parents ?? [], name)
  const schools: SchoolId[] = ['michelis', 'ndj']
  for (const plan of Object.values(next.plans)) {
    for (const day of Object.values(plan)) {
      for (const schoolId of schools) {
        for (const slot of Object.values(day[schoolId])) {
          slot.availableParents = withoutName(slot.availableParents, name)
          if (slot.accompanying && sameName(slot.accompanying, name)) {
            slot.accompanying = null
          }
        }
      }
    }
  }
  return next
}

export function subscribeToCloud(
  onChange: (state: AppState) => void,
  shouldApply: () => boolean,
): () => void {
  const id = window.setInterval(() => {
    void (async () => {
      if (!shouldApply()) return
      try {
        const res = await fetch('/api/planning', { credentials: 'include' })
        if (!res.ok) return
        const data = (await res.json()) as { persisted?: boolean; state?: AppState | null }
        if (!data.persisted || !data.state) return
        if (!shouldApply()) return
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
