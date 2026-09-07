import { json, readJsonBody } from '../lib/http.mjs'
import { getPlanningStore } from '../lib/planning-store.mjs'
import { cookieHeaderFromEvent, hasValidSession } from '../lib/session.mjs'

export async function handler(event) {
  if (!hasValidSession(cookieHeaderFromEvent(event.headers))) {
    return json(401, { error: 'unauthorized' })
  }

  let store
  try {
    store = await getPlanningStore()
  } catch {
    return json(200, { persisted: false, state: null })
  }

  if (!store) {
    return json(200, { persisted: false, state: null })
  }

  if (event.httpMethod === 'GET') {
    try {
      const state = await store.load()
      return json(200, { persisted: true, state })
    } catch {
      return json(500, { error: 'load_failed' })
    }
  }

  if (event.httpMethod === 'PUT') {
    try {
      const state = readJsonBody(event)
      if (!state || typeof state !== 'object') {
        return json(400, { error: 'invalid_body' })
      }
      await store.save(state)
      return json(200, { ok: true, persisted: true })
    } catch {
      return json(500, { error: 'save_failed' })
    }
  }

  return json(405, { error: 'method' })
}
