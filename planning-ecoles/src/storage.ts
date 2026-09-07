import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { STORAGE_KEY } from './constants'
import {
  emptySlot,
  emptyWeekPlan,
  type AppState,
  type DaySlots,
  type WeekPlan,
} from './types'

let supabase: SupabaseClient | null = null

/** Migre l'ancien libellé interne `apresmidi` → `soir` */
function migrateDaySlots(raw: DaySlots & { michelis?: Record<string, unknown>; ndj?: Record<string, unknown> }): DaySlots {
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

function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return null
  if (!supabase) supabase = createClient(url, key)
  return supabase
}

export function isCloudSyncEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
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
  const client = getSupabase()
  if (!client) return loadLocal()

  const { data, error } = await client
    .from('planning_state')
    .select('payload')
    .eq('id', 'main')
    .maybeSingle()

  if (error || !data?.payload) {
    return loadLocal()
  }

  const remote = migrateState(data.payload as AppState)
  saveLocal(remote)
  return remote
}

export async function saveState(state: AppState): Promise<void> {
  saveLocal(state)
  const client = getSupabase()
  if (!client) return

  await client.from('planning_state').upsert({
    id: 'main',
    payload: state,
    updated_at: new Date().toISOString(),
  })
}

export function ensureWeek(state: AppState, weekStart: string): WeekPlan {
  if (!state.plans[weekStart]) {
    state.plans[weekStart] = emptyWeekPlan()
  }
  return state.plans[weekStart]
}

export function subscribeToCloud(onChange: (state: AppState) => void): () => void {
  const client = getSupabase()
  if (!client) return () => {}

  const channel = client
    .channel('planning-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'planning_state', filter: 'id=eq.main' },
      (payload) => {
        const row = payload.new as { payload?: AppState } | null
        if (row?.payload) {
          saveLocal(row.payload)
          onChange(row.payload)
        }
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
