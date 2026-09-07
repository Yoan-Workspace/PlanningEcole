import { json } from '../lib/http.mjs'
import { cookieHeaderFromEvent, hasValidSession } from '../lib/session.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'method' })
  }
  if (!hasValidSession(cookieHeaderFromEvent(event.headers))) {
    return json(401, { error: 'unauthorized' })
  }
  return json(200, { ok: true })
}
