import { useState, type FormEvent } from 'react'
import { login } from './auth'

interface AccessGateProps {
  onUnlock: () => void
  serverDown?: boolean
}

export function AccessGate({ onUnlock, serverDown = false }: AccessGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(
    serverDown ? 'Le serveur d’authentification ne répond pas.' : '',
  )
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    const result = await login(code)
    setPending(false)
    if (result.ok) {
      onUnlock()
      return
    }
    setError(result.error)
  }

  return (
    <div className="gate">
      <div className="gate-panel">
        <p className="brand">Trajets</p>
        <h1>Planning des écoles</h1>
        <p className="lede">
          Espace privé pour les trajets Michelis et NDJ.
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
            disabled={pending}
          />
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending ? 'Vérification…' : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
