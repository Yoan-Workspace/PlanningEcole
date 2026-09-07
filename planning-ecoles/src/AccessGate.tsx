import { useState, type FormEvent } from 'react'
import { DEFAULT_ACCESS_CODE } from './constants'

interface AccessGateProps {
  onUnlock: () => void
}

export function AccessGate({ onUnlock }: AccessGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const expected = (import.meta.env.VITE_ACCESS_CODE as string | undefined) || DEFAULT_ACCESS_CODE

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.trim() === expected) {
      sessionStorage.setItem('planning-ecoles-auth', '1')
      onUnlock()
      return
    }
    setError('Code incorrect. Réessaie.')
  }

  return (
    <div className="gate">
      <div className="gate-panel">
        <p className="brand">Trajets</p>
        <h1>Planning des écoles</h1>
        <p className="lede">
          Espace privé pour organiser les trajets matin et après-midi entre École Michelis et NDJ.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="access-code">Code d&apos;accès</label>
          <input
            id="access-code"
            type="password"
            inputMode="text"
            autoComplete="current-password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError('')
            }}
            placeholder="Entrez le code partagé"
            autoFocus
          />
          {error ? <p className="error">{error}</p> : null}
          <button type="submit">Entrer</button>
        </form>
      </div>
    </div>
  )
}
