async function fromSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const base = `${url.replace(/\/$/, '')}/rest/v1/planning_state`
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  return {
    async load() {
      const res = await fetch(`${base}?id=eq.main&select=payload`, { headers })
      if (!res.ok) throw new Error('supabase_load_failed')
      const rows = await res.json()
      return rows[0]?.payload ?? null
    },
    async save(state) {
      const res = await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          id: 'main',
          payload: state,
          updated_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('supabase_save_failed')
    },
  }
}

async function fromBlobs() {
  if (!process.env.NETLIFY) return null
  const { getStore } = await import('@netlify/blobs')
  const store = getStore('planning')
  return {
    async load() {
      return (await store.get('main', { type: 'json' })) ?? null
    },
    async save(state) {
      await store.setJSON('main', state)
    },
  }
}

export async function getPlanningStore() {
  return (await fromSupabase()) ?? (await fromBlobs())
}
