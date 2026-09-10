import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessGate } from './AccessGate'
import { fetchSession, logout, type SessionStatus } from './auth'
import { SESSION_NAME_KEY, TUTORIAL_SEEN_KEY } from './constants'
import { HowItWorks } from './HowItWorks'
import { sameName, withName } from './names'
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
} from './storage'
import type { AppState, Period, SchoolId, Slot, Weekday } from './types'
import { WeekBoard } from './WeekBoard'
import { WhoAreYou } from './WhoAreYou'
import './App.css'

type Selection = { day: Weekday; school: SchoolId; period: Period }

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

export default function App() {
  const [session, setSession] = useState<SessionStatus>('checking')
  const [name, setName] = useState(
    () => localStorage.getItem(SESSION_NAME_KEY) || '',
  )
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [saving, setSaving] = useState(false)
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
    return () => window.clearTimeout(persistTimer.current)
  }, [])

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
    setSaving(true)
    dirtyRef.current = true

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

  function persistSoon(next: AppState, delay = 2000) {
    dirtyRef.current = true
    localUpdatedAt.current = Date.now()
    pendingPersistRef.current = next
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = 0
      const pending = pendingPersistRef.current
      if (pending) void persist(pending)
    }, delay)
  }

  function flushPendingPersist() {
    window.clearTimeout(persistTimer.current)
    persistTimer.current = 0
    const pending = pendingPersistRef.current
    if (pending) void persist(pending)
  }

  function rememberName(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    localStorage.setItem(SESSION_NAME_KEY, trimmed)
    setName(trimmed)
  }

  function addParent(value: string): boolean {
    if (!state) return false
    const nextList = withName(state.parents ?? [], value)
    if (nextList.length === (state.parents ?? []).length) return false
    const next: AppState = structuredClone(state)
    next.parents = nextList
    void persist(next)
    return true
  }

  function updateSlot(day: Weekday, school: SchoolId, period: Period, slot: Slot) {
    if (!state) return
    const next: AppState = structuredClone(state)
    ensureWeek(next, next.weekStart)
    next.plans[next.weekStart][day][school][period] = slot
    void persist(next)
  }

  function updateDayNote(day: Weekday, note: string) {
    if (!state) return
    const next: AppState = structuredClone(state)
    ensureWeek(next, next.weekStart)
    next.plans[next.weekStart][day].note = note
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
    setSelected(null)
    setHelpOpen(true)
  }

  async function handleLogout() {
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
        <p className="loading">Chargement du planning…</p>
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
  const canGoBack = state.weekStart > oldestAllowedWeek()
  const selectionSlot = selected
    ? plan[selected.day][selected.school][selected.period]
    : null

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
              <span className={`sync ${cloud ? 'cloud' : 'local'}`}>
                {cloud ? (saving ? 'Enregistrement…' : 'Enregistré') : 'Cet appareil'}
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
            onChange={(slot) =>
              updateSlot(selected.day, selected.school, selected.period, slot)
            }
            onClose={() => setSelected(null)}
          />
        ) : null}
        <HowItWorks open={helpOpen} onClose={closeHelp} />
      </main>
    </div>
  )
}
