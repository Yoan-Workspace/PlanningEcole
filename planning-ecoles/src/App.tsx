import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessGate } from './AccessGate'
import { fetchSession, logout, type SessionStatus } from './auth'
import { SESSION_NAME_KEY, SESSION_WEEK_KEY, TUTORIAL_SEEN_KEY } from './constants'
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
  saveState,
  shiftWeek,
  subscribeToCloud,
} from './storage'
import type { AppState, Period, SchoolId, Slot, Weekday } from './types'
import { WeekBoard } from './WeekBoard'
import { WhoAreYou } from './WhoAreYou'
import './App.css'

type Selection = { day: Weekday; school: SchoolId; period: Period }

function readViewWeek(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_WEEK_KEY)
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored
  } catch {
    /* ignore */
  }
  return getMonday()
}

function writeViewWeek(weekStart: string) {
  try {
    sessionStorage.setItem(SESSION_WEEK_KEY, weekStart)
  } catch {
    /* ignore */
  }
}

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
  const viewWeekRef = useRef(readViewWeek())

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
        const viewWeek = readViewWeek()
        ensureWeek(loaded, viewWeek)
        loaded.weekStart = viewWeek
        writeViewWeek(viewWeek)
        viewWeekRef.current = viewWeek
        baseRef.current = structuredClone(loaded)
        localUpdatedAt.current = loaded.updatedAt ?? 0
        dirtyRef.current = false
        setSaveError(false)
        setState(loaded)
        setCloud(isCloudSyncEnabled())
        setLoading(false)
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
          const next = { ...remote, weekStart }
          ensureWeek(next, weekStart)
          return next
        })
        setCloud(isCloudSyncEnabled())
      },
      () => !savingRef.current && !dirtyRef.current,
    )
  }, [session])

  async function persist(next: AppState) {
    const stamped: AppState = { ...next, updatedAt: Date.now() }
    localUpdatedAt.current = stamped.updatedAt ?? 0
    dirtyRef.current = true
    savingRef.current = true
    setState({ ...stamped, weekStart: viewWeekRef.current })
    setSaving(true)
    try {
      const saved = await saveState(stamped, baseRef.current)
      baseRef.current = structuredClone(saved)
      localUpdatedAt.current = saved.updatedAt ?? Date.now()
      const weekStart = viewWeekRef.current
      const shown = { ...saved, weekStart }
      ensureWeek(shown, weekStart)
      setState(shown)
      setSaveError(false)
      dirtyRef.current = false
    } catch {
      setSaveError(true)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function persistSoon(next: AppState) {
    dirtyRef.current = true
    localUpdatedAt.current = Date.now()
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      void persist(next)
    }, 450)
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
    const next: AppState = structuredClone(state)
    next.weekStart = weekStart
    ensureWeek(next, weekStart)
    writeViewWeek(weekStart)
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
            aria-label="Semaine précédente"
          >
            ←
          </button>
          <span className="week-label">
            <strong>Semaine {getWeekNumber(state.weekStart)}</strong>
            <span>{formatWeekRange(state.weekStart)}</span>
            {state.weekStart !== getMonday() ? (
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
          onSelect={(day, school, period) => setSelected({ day, school, period })}
          onDayNote={updateDayNote}
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
