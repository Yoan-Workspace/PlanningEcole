import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  clearSessionCookie,
  codesMatch,
  getAccessCode,
  getSessionSecret,
  hasValidSession,
  isAuthConfigured,
  sessionCookie,
  signSession,
} from './netlify/lib/session.mjs'

const DATA_FILE = path.join(process.cwd(), '.data', 'planning.json')

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(body))
}

function loadFileState(): unknown {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return null
  }
}

function saveFileState(state: unknown) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(state))
}

export function devApiPlugin(): Plugin {
  return {
    name: 'planning-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (!url?.startsWith('/api/')) {
          next()
          return
        }

        void (async () => {
          const cookie = req.headers.cookie ?? ''

          if (url === '/api/login' && req.method === 'POST') {
            if (!isAuthConfigured()) {
              send(res, 500, { error: 'server_misconfigured' })
              return
            }
            let code = ''
            try {
              code = JSON.parse(await readBody(req)).code ?? ''
            } catch {
              send(res, 400, { error: 'invalid_body' })
              return
            }
            if (!codesMatch(code, getAccessCode())) {
              send(res, 401, { error: 'invalid_code' })
              return
            }
            const token = signSession(getSessionSecret())
            send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(token, { secure: false }) })
            return
          }

          if (url === '/api/logout' && req.method === 'POST') {
            send(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie({ secure: false }) })
            return
          }

          if (url === '/api/session' && req.method === 'GET') {
            if (!hasValidSession(cookie)) {
              send(res, 401, { error: 'unauthorized' })
              return
            }
            send(res, 200, { ok: true })
            return
          }

          if (url === '/api/planning') {
            if (!hasValidSession(cookie)) {
              send(res, 401, { error: 'unauthorized' })
              return
            }
            if (req.method === 'GET') {
              send(res, 200, { persisted: true, state: loadFileState() })
              return
            }
            if (req.method === 'PUT') {
              try {
                const state = JSON.parse(await readBody(req))
                saveFileState(state)
                send(res, 200, { ok: true, persisted: true })
              } catch {
                send(res, 400, { error: 'invalid_body' })
              }
              return
            }
          }

          send(res, 404, { error: 'not_found' })
        })()
      })
    },
  }
}
