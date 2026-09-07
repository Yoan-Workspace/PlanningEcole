import { useEffect, useState } from 'react'
import { AccessGate } from './AccessGate'
import { fetchSession, logout, type SessionStatus } from './auth'
import { SESSION_NAME_KEY } from './constants'
import { SlotEditor } from './SlotEditor'
import {
  ensureWeek,
  formatWeekLabel,
  getMonday,
  isCloudSyncEnabled,
  loadState,
  saveState,
  shiftWeek,
  subscribeToCloud,
} from './storage'
import type { AppState, Period, SchoolId, Slot, Weekday } from './types'
import { WeekBoard } from './WeekBoard'
import './App.css'

type Selection = { day: Weekday; school: SchoolId; period: Period }

export default function App() {
  const [session, setSession] = useState<SessionStatus>('checking')
  const [name, setName] = useState(
    () => localStorage.getItem(SESSION_NAME_KEY) || '',
  )
  const [nameDraft, setNameDraft] = useState(name)
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [saving, setSaving] = useState(false)
  const [cloud, setCloud] = useState(false)

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
        if (!loaded.weekStart) loaded.weekStart = getMonday()
        ensureWeek(loaded, loaded.weekStart)
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
    if (session !== 'in') return
    return subscribeToCloud((remote) => {
      setState(remote)
      setCloud(isCloudSyncEnabled())
    })
  }, [session])

  async function persist(next: AppState) {
    setState(next)
    setSaving(true)
    try {
      await saveState(next)
    } finally {
      setSaving(false)
    }
  }

  function rememberName(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    localStorage.setItem(SESSION_NAME_KEY, trimmed)
    setName(trimmed)
  }

  function updateSlot(day: Weekday, school: SchoolId, period: Period, slot: Slot) {
    if (!state) return
    const next: AppState = structuredClone(state)
    ensureWeek(next, next.weekStart)
    next.plans[next.weekStart][day][school][period] = slot
    void persist(next)
  }

  function goWeek(delta: number) {
    if (!state) return
    const next: AppState = structuredClone(state)
    next.weekStart = shiftWeek(next.weekStart, delta)
    ensureWeek(next, next.weekStart)
    setSelected(null)
    void persist(next)
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

  if (!name) {
    return (
      <div className="gate">
        <div className="gate-panel">
          <p className="brand">Trajets</p>
          <h1>Qui es-tu ?</h1>
          <p className="lede">
            Indique ton prénom pour marquer tes disponibilités et être reconnu dans le planning.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              rememberName(nameDraft)
            }}
          >
            <label htmlFor="prenom">Prénom</label>
            <input
              id="prenom"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ex. Camille"
              autoFocus
            />
            <button type="submit">Continuer</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading || !state) {
    return (
      <div className="gate">
        <p className="loading">Chargement du planning…</p>
      </div>
    )
  }

  const plan = ensureWeek(state, state.weekStart)
  const selectionSlot = selected
    ? plan[selected.day][selected.school][selected.period]
    : null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <p className="brand">Trajets</p>
          <h1>Planning</h1>
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
          <span className="week-label">{formatWeekLabel(state.weekStart)}</span>
          <button
            type="button"
            className="ghost icon-btn"
            onClick={() => goWeek(1)}
            aria-label="Semaine suivante"
          >
            →
          </button>
        </div>
        <div className="user-meta">
          <span>
            {name}
            <button
              type="button"
              className="linkish"
              onClick={() => {
                localStorage.removeItem(SESSION_NAME_KEY)
                setName('')
                setNameDraft('')
              }}
            >
              changer
            </button>
            <button type="button" className="linkish" onClick={() => void handleLogout()}>
              quitter
            </button>
          </span>
          <span className={`sync ${cloud ? 'cloud' : 'local'}`}>
            {cloud ? (saving ? 'Sync…' : 'Cloud sync') : 'Local'}
          </span>
        </div>
      </header>

      {!cloud ? (
        <p className="banner">
          Mode local (cet appareil). Sur Netlify, le planning est partagé après connexion.
        </p>
      ) : null}

      <main className={`main ${selected ? 'with-editor' : ''}`}>
        <WeekBoard
          plan={plan}
          selected={selected}
          onSelect={(day, school, period) => setSelected({ day, school, period })}
        />
        {selected && selectionSlot ? (
          <SlotEditor
            day={selected.day}
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
      </main>
    </div>
  )
}
