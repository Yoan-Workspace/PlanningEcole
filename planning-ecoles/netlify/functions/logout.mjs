import { json } from '../lib/http.mjs'
import { clearSessionCookie, isSecureRequest } from '../lib/session.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method' })
  }
  const secure = isSecureRequest(event.headers)
  return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie({ secure }) })
}
