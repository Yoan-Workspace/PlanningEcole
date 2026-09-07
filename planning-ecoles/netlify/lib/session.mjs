import crypto from 'node:crypto'

export const COOKIE_NAME = 'planning_session'
export const MAX_AGE_SEC = 60 * 60 * 24 * 30

export function getAccessCode() {
  return process.env.ACCESS_CODE ?? ''
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET ?? ''
}

export function isAuthConfigured() {
  return Boolean(getAccessCode() && getSessionSecret())
}

export function isSecureRequest(headers) {
  const proto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || ''
  return String(proto).split(',')[0].trim() === 'https'
}

export function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

export function signSession(secret) {
  const payload = JSON.stringify({ exp: Date.now() + MAX_AGE_SEC * 1000 })
  const body = Buffer.from(payload).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(secret, token) {
  if (!secret || !token) return false
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!crypto.timingSafeEqual(a, b)) return false
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function codesMatch(provided, expected) {
  if (!expected || provided == null) return false
  const a = Buffer.from(String(provided).trim(), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function sessionCookie(token, { secure }) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function clearSessionCookie({ secure }) {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function hasValidSession(cookieHeader) {
  const secret = getSessionSecret()
  const token = parseCookies(cookieHeader)[COOKIE_NAME]
  return verifySession(secret, token)
}

export function cookieHeaderFromEvent(headers) {
  return headers.cookie || headers.Cookie || ''
}
