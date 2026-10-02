import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AccessGate } from './AccessGate'
import { fetchSession, logout, type SessionStatus } from './auth'
import { SESSION_NAME_KEY, TUTORIAL_SEEN_KEY, WEEKDAYS } from './constants'
import { HowItWorks } from './HowItWorks'
import { sameName, withName, withoutName } from './names'
import { SlotEditor } from './SlotEditor'
import {
  ensureWeek,
  formatDayLabel,
  formatWeekRange,
  getMonday,
  getWeekNumber,
  isCloudSyncEnabled,
  loadState,
  oldestAllowedWeek,
  pruneOldWeeks,
  didPruneWeeks,
  saveState,
  scrollWeekday,
  shiftWeek,
  subscribeToCloud,
  writeLocalState,
} from './storage'
import type { AppState, Period, SchoolId, Slot, WeekPlan, Weekday } from './types'
import { WeekBoard } from './WeekBoard'
import { WhoAreYou } from './WhoAreYou'
import './App.css'

type Selection = { day: Weekday; school: SchoolId; period: Period }

const SLOT_SAVE_DELAY = 500
const NOTE_SAVE_DELAY = 2000
const SLOW_SAVE_MS = 700

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

function daysWithParent(
  plan: WeekPlan | undefined,
  school: SchoolId,
  period: Period,
  currentName: string,
): Weekday[] {
  if (!plan) return []
  return WEEKDAYS.filter((weekday) =>
    plan[weekday][school][period].availableParents.some((parent) =>
      sameName(parent, currentName),
    ),
  )
}

function SaveTrajetMark() {
  return (
    <svg className="sync-mark" viewBox="0 0 40 18" aria-hidden="true">
      <path className="sync-ground" d="M1 16.2h38" />
      <path
        className="sync-school michelis"
        d="M1.5 15.5V8.4L8 3.2l6.5 5.2v7.1H11V11H5v4.5H1.5Z"
      />
      <rect className="sync-door" x="6.7" y="11.2" width="2.6" height="4.3" rx="0.4" />
      <path
        className="sync-school ndj"
        d="M25.5 15.5V8.4L32 3.2l6.5 5.2v7.1H35V11h-6v4.5h-3.5Z"
      />
      <rect className="sync-door" x="30.7" y="11.2" width="2.6" height="4.3" rx="0.4" />
      <path className="sync-road" d="M14.6 15.35h10.8" />
      <g className="sync-kid">
        <circle cx="8" cy="10.15" r="1.2" />
        <circle cx="8" cy="13.55" r="1.65" />
      </g>
    </svg>
  )
}

function SavingOverlay({
  open,
  title,
  hint,
}: {
  open: boolean
  title: string
  hint: string
}) {
  if (!open) return null
  return createPortal(
    <div className="sync-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="sync-overlay-card">
        <SaveTrajetMark />
        <div className="sync-scene-labels">
          <span>Michelis</span>
          <span>NDJ</span>
        </div>
        <p className="sync-overlay-copy">
          <strong>{title}</strong>
          <span>{hint}</span>
        </p>
      </div>
    </div>,
    document.body,
  )
}

export default function App() {
  const [session, setSession] = useState<SessionStatus>('checking')
  const [name, setName] = useState(
    () => localStorage.getItem(SESSION_NAME_KEY) || '',
  )
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingUi, setSavingUi] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [cloud, setCloud] = useState(false)
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenTutorial())
  const savingRef = useRef(false)
  const dirtyRef = useRef(false)
  const baseRef = useRef<AppState | null>(null)
  const localUpdatedAt = useRef(0)
  const persistTimer = useRef(0)
  const pendingPersistRef = useRef<AppState | null>(null)
  const viewWeekRef = useRef(getMonday())
  const persistRef = useRef<(next: AppState) => Promise<void>>(async () => {})
  const stateRef = useRef<AppState | null>(null)
  stateRef.current = state

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const status = await fetchSession()
      if (!cancelled) setSession(status)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (session !== 'in') return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const loaded = await loadState()
      if (!cancelled) {
        const trimmed = pruneOldWeeks(loaded)
        const viewWeek = getMonday()
        ensureWeek(trimmed, viewWeek)
        trimmed.weekStart = viewWeek
        viewWeekRef.current = viewWeek
        baseRef.current = structuredClone(trimmed)
        localUpdatedAt.current = trimmed.updatedAt ?? 0
        dirtyRef.current = false
        setSaveError(false)
        setState(trimmed)
        setCloud(isCloudSyncEnabled())
        setLoading(false)
        if (didPruneWeeks(loaded, trimmed) && isCloudSyncEnabled()) {
          void saveState(trimmed, trimmed)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') flushPendingPersist()
    }
    document.addEventListener('visibilitychange', flushIfHidden)
    window.addEventListener('pagehide', flushPendingPersist)
    return () => {
      window.clearTimeout(persistTimer.current)
      document.removeEventListener('visibilitychange', flushIfHidden)
      window.removeEventListener('pagehide', flushPendingPersist)
    }
  }, [])

  useEffect(() => {
    if (!saving) {
      setSavingUi(false)
      return
    }
    const id = window.setTimeout(() => setSavingUi(true), SLOW_SAVE_MS)
    return () => window.clearTimeout(id)
  }, [saving])

  useEffect(() => {
    if (session !== 'in') return
    return subscribeToCloud(
      (remote) => {
        if ((remote.updatedAt ?? 0) < localUpdatedAt.current) return
        localUpdatedAt.current = remote.updatedAt ?? Date.now()
        baseRef.current = structuredClone(remote)
        setState(() => {
          const weekStart = viewWeekRef.current
          const next = pruneOldWeeks({ ...remote, weekStart })
          ensureWeek(next, weekStart)
          return next
        })
        setCloud(isCloudSyncEnabled())
      },
      () => !savingRef.current && !dirtyRef.current,
    )
  }, [session])

  async function persist(next: AppState) {
    pendingPersistRef.current = next
    if (savingRef.current) {
      dirtyRef.current = true
      return
    }

    savingRef.current = true
    dirtyRef.current = true
    setSaving(true)

    try {
      while (pendingPersistRef.current) {
        const snapshot = pendingPersistRef.current
        pendingPersistRef.current = null
        const stamped: AppState = { ...snapshot, updatedAt: Date.now() }
        localUpdatedAt.current = stamped.updatedAt ?? 0
        try {
          const saved = await saveState(stamped, baseRef.current)
          baseRef.current = structuredClone(saved)
          localUpdatedAt.current = saved.updatedAt ?? Date.now()
          if (pendingPersistRef.current) {
            dirtyRef.current = true
            continue
          }
          if (persistTimer.current) {
            dirtyRef.current = true
            break
          }
          const weekStart = viewWeekRef.current
          const shown = { ...saved, weekStart }
          ensureWeek(shown, weekStart)
          stateRef.current = shown
          setState(shown)
          setSaveError(false)
          dirtyRef.current = false
        } catch {
          setSaveError(true)
          break
        }
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  persistRef.current = persist

  function persistSoon(next: AppState, delay = NOTE_SAVE_DELAY) {
    dirtyRef.current = true
    localUpdatedAt.current = Date.now()
    pendingPersistRef.current = next
    writeLocalState(next)
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = 0
      const pending = pendingPersistRef.current
      if (pending) void persistRef.current(pending)
    }, delay)
  }

  function flushPendingPersist() {
    window.clearTimeout(persistTimer.current)
    persistTimer.current = 0
    const pending = pendingPersistRef.current
    if (pending) void persistRef.current(pending)
  }

  function rememberName(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    localStorage.setItem(SESSION_NAME_KEY, trimmed)
    setName(trimmed)
  }

  function addParent(value: string): boolean {
    const current = stateRef.current
    if (!current) return false
    const nextList = withName(current.parents ?? [], value)
    if (nextList.length === (current.parents ?? []).length) return false
    const next: AppState = structuredClone(current)
    next.parents = nextList
    stateRef.current = next
    void persist(next)
    return true
  }

  function updateSlot(day: Weekday, school: SchoolId, period: Period, slot: Slot) {
    const current = stateRef.current
    if (!current) return
    const next: AppState = structuredClone(current)
    ensureWeek(next, next.weekStart)
    next.plans[next.weekStart][day][school][period] = slot
    stateRef.current = next
    setState(next)
    persistSoon(next, SLOT_SAVE_DELAY)
  }

  function setParentAvailability(
    weekday: Weekday,
    weekOffset: 0 | 1,
    available: boolean,
  ) {
    const current = stateRef.current
    if (!current || !selected) return
    const weekStart =
      weekOffset === 0 ? current.weekStart : shiftWeek(current.weekStart, 1)
    const next: AppState = structuredClone(current)
    const plan = ensureWeek(next, weekStart)
    const slot = plan[weekday][selected.school][selected.period]
    if (available) {
      slot.availableParents = withName(slot.availableParents, name)
    } else {
      slot.availableParents = withoutName(slot.availableParents, name)
      if (slot.accompanying && sameName(slot.accompanying, name)) {
        slot.accompanying = null
      }
    }
    stateRef.current = next
    setState(next)
    persistSoon(next, SLOT_SAVE_DELAY)
  }

  function updateDayNote(day: Weekday, note: string) {
    const current = stateRef.current
    if (!current) return
    const next: AppState = structuredClone(current)
    ensureWeek(next, next.weekStart)
    next.plans[next.weekStart][day].note = note
    stateRef.current = next
    setState(next)
    persistSoon(next)
  }

  function goToWeek(weekStart: string) {
    if (!state) return
    const oldest = oldestAllowedWeek()
    if (weekStart < oldest) return
    flushPendingPersist()
    const next: AppState = structuredClone(state)
    next.weekStart = weekStart
    ensureWeek(next, weekStart)
    viewWeekRef.current = weekStart
    setSelected(null)
    setState(next)
  }

  function goWeek(delta: number) {
    if (!state) return
    goToWeek(shiftWeek(state.weekStart, delta))
  }

  function goToday() {
    goToWeek(getMonday())
  }

  const closeHelp = useCallback(() => {
    markTutorialSeen()
    setHelpOpen(false)
  }, [])

  function openHelp() {
    flushPendingPersist()
    setSelected(null)
    setHelpOpen(true)
  }

  async function handleLogout() {
    flushPendingPersist()
    await logout()
    setState(null)
    setSelected(null)
    setSession('out')
  }

  if (session === 'checking') {
    return (
      <div className="gate">
        <p className="loading">Vérification de l’accès…</p>
      </div>
    )
  }

  if (session !== 'in') {
    return (
      <AccessGate
        serverDown={session === 'down'}
        onUnlock={() => setSession('in')}
      />
    )
  }

  if (loading || !state) {
    return (
      <div className="gate">
        <SavingOverlay
          open
          title="Chargement"
          hint="On récupère le planning des deux écoles"
        />
      </div>
    )
  }

  const known = (state.parents ?? []).some((parent) => sameName(parent, name))
  if (!name || !known) {
    return (
      <WhoAreYou
        parents={state.parents ?? []}
        onChoose={rememberName}
        onAdd={addParent}
      />
    )
  }

  const plan = ensureWeek(state, state.weekStart)
  const thisWeek = getMonday()
  const nextWeekStart = shiftWeek(state.weekStart, 1)
  const canGoBack = state.weekStart > oldestAllowedWeek()
  const selectionSlot = selected
    ? plan[selected.day][selected.school][selected.period]
    : null
  const thisWeekAvailable = selected
    ? daysWithParent(plan, selected.school, selected.period, name)
    : []
  const nextWeekAvailable = selected
    ? daysWithParent(
        state.plans[nextWeekStart],
        selected.school,
        selected.period,
        name,
      )
    : []

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-lead">
          <div className="topbar-title">
            <p className="brand">Trajets</p>
            <p className="who">
              <span className="who-name">{name}</span>
              <span className="who-actions">
                <button
                  type="button"
                  className="who-chip"
                  onClick={() => {
                    localStorage.removeItem(SESSION_NAME_KEY)
                    setName('')
                  }}
                >
                  Changer
                </button>
                <button type="button" className="who-chip" onClick={() => void handleLogout()}>
                  Quitter
                </button>
              </span>
            </p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="help-btn"
              aria-label="Comment ça marche"
              aria-expanded={helpOpen}
              onClick={openHelp}
            >
              ?
            </button>
            {cloud && saveError ? (
              <button
                type="button"
                className="sync error"
                onClick={() => void persist(state)}
              >
                Non enregistré
              </button>
            ) : (
              <span
                className={`sync ${saving ? 'saving' : cloud ? 'cloud' : 'local'}`}
                aria-live="polite"
                aria-busy={saving}
              >
                {saving ? 'Enregistrement…' : cloud ? 'Enregistré' : 'Cet appareil'}
              </span>
            )}
          </div>
        </div>
        <div className="week-nav">
          <button
            type="button"
            className="ghost icon-btn"
            onClick={() => goWeek(-1)}
            disabled={!canGoBack}
            aria-label="Semaine précédente"
          >
            ←
          </button>
          <span className="week-label">
            <strong>Semaine {getWeekNumber(state.weekStart)}</strong>
            <span>{formatWeekRange(state.weekStart)}</span>
            {state.weekStart !== thisWeek ? (
              <button type="button" className="today-btn" onClick={goToday}>
                Aujourd’hui
              </button>
            ) : null}
          </span>
          <button
            type="button"
            className="ghost icon-btn"
            onClick={() => goWeek(1)}
            aria-label="Semaine suivante"
          >
            →
          </button>
        </div>
      </header>

      <main className={`main ${selected ? 'with-editor' : ''}`}>
        <WeekBoard
          weekStart={state.weekStart}
          plan={plan}
          selected={selected}
          currentName={name}
          scrollToDay={state.weekStart === thisWeek ? scrollWeekday() : null}
          onSelect={(day, school, period) => setSelected({ day, school, period })}
          onDayNote={updateDayNote}
          onDayNoteFlush={flushPendingPersist}
        />
        {selected && selectionSlot ? (
          <SlotEditor
            day={selected.day}
            dayLabel={formatDayLabel(state.weekStart, selected.day)}
            school={selected.school}
            period={selected.period}
            slot={selectionSlot}
            currentName={name}
            thisWeekDays={thisWeekAvailable}
            nextWeekDays={nextWeekAvailable}
            thisWeekRange={formatWeekRange(state.weekStart)}
            nextWeekRange={formatWeekRange(nextWeekStart)}
            onChange={(slot) =>
              updateSlot(selected.day, selected.school, selected.period, slot)
            }
            onToggleDay={setParentAvailability}
            onClose={() => {
              flushPendingPersist()
              setSelected(null)
            }}
          />
        ) : null}
        <HowItWorks open={helpOpen} onClose={closeHelp} />
        <SavingOverlay
          open={savingUi}
          title="Enregistrement"
          hint="Le planning des deux écoles se met à jour"
        />
      </main>
    </div>
  )
}
