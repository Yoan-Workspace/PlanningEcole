export type SessionStatus = 'checking' | 'in' | 'out' | 'down'

function isJsonResponse(res: Response): boolean {
  return (res.headers.get('content-type') ?? '').includes('application/json')
}

export async function fetchSession(): Promise<SessionStatus> {
  try {
    const res = await fetch('/api/session', { credentials: 'include' })
    if (!isJsonResponse(res)) return 'down'
    if (res.ok) return 'in'
    if (res.status === 401) return 'out'
    return 'down'
  } catch {
    return 'down'
  }
}

export async function login(code: string): Promise<{ ok: boolean; error: string }> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (res.ok) return { ok: true, error: '' }
    if (res.status === 401) return { ok: false, error: 'Code incorrect. Réessaie.' }
    if (res.status === 500) {
      return {
        ok: false,
        error: 'Le serveur n’est pas configuré. Vérifie les variables d’environnement.',
      }
    }
    return { ok: false, error: 'Connexion impossible. Réessaie plus tard.' }
  } catch {
    return { ok: false, error: 'Connexion impossible. Réessaie plus tard.' }
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
  } catch {
    /* ignore */
  }
}
