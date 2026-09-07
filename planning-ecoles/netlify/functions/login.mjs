import { json, readJsonBody } from '../lib/http.mjs'
import {
  codesMatch,
  getAccessCode,
  getSessionSecret,
  isAuthConfigured,
  isSecureRequest,
  sessionCookie,
  signSession,
} from '../lib/session.mjs'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method' })
  }

  if (!isAuthConfigured()) {
    return json(500, { error: 'server_misconfigured' })
  }

  let code = ''
  try {
    code = readJsonBody(event).code ?? ''
  } catch {
    return json(400, { error: 'invalid_body' })
  }

  if (!codesMatch(code, getAccessCode())) {
    return json(401, { error: 'invalid_code' })
  }

  const token = signSession(getSessionSecret())
  const secure = isSecureRequest(event.headers)
  return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(token, { secure }) })
}
