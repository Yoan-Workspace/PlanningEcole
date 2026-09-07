import { useState, type FormEvent } from 'react'
import { sameName } from './names'

interface WhoAreYouProps {
  parents: string[]
  onChoose: (name: string) => void
  onAdd: (name: string) => boolean
  onRemove: (name: string) => void
}

export function WhoAreYou({ parents, onChoose, onAdd, onRemove }: WhoAreYouProps) {
  const [picked, setPicked] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const ok = onAdd(draft)
    if (!ok) {
      setError(draft.trim() ? 'Ce prénom est déjà dans la liste.' : 'Entre un prénom.')
      return
    }
    setPicked(draft.trim())
    setDraft('')
    setError('')
  }

  function handleRemove(name: string) {
    if (!confirm(`Supprimer ${name} de la liste ?`)) return
    onRemove(name)
    if (sameName(picked, name)) setPicked('')
  }

  return (
    <div className="gate identity">
      <div className="gate-panel identity">
        <p className="brand">Trajets</p>
        <h1>Qui es-tu ?</h1>
        <p className="lede">Coche ton prénom pour marquer tes disponibilités.</p>

        {parents.length === 0 ? (
          <p className="hint">Aucun parent pour le moment. Ajoutes-en un ci-dessous.</p>
        ) : (
          <ul className="identity-list">
            {parents.map((parent) => {
              const selected = sameName(picked, parent)
              return (
                <li key={parent} className="identity-row">
                  <button
                    type="button"
                    className={`identity-choice ${selected ? 'on' : ''}`}
                    onClick={() => {
                      setPicked(parent)
                      setError('')
                    }}
                  >
                    <span className={`tick ${selected ? 'on' : ''}`} aria-hidden="true" />
                    {parent}
                  </button>
                  <button
                    type="button"
                    className="ghost identity-delete"
                    aria-label={`Supprimer ${parent}`}
                    onClick={() => handleRemove(parent)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <form className="identity-add" onSubmit={handleAdd}>
          <label htmlFor="new-parent">Ajouter un parent</label>
          <div className="identity-add-row">
            <input
              id="new-parent"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setError('')
              }}
              placeholder="Prénom"
              autoComplete="given-name"
              enterKeyHint="done"
            />
            <button type="submit" className="ghost">
              Ajouter
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </form>

        <button type="button" disabled={!picked} onClick={() => onChoose(picked)}>
          Continuer
        </button>
      </div>
    </div>
  )
}
