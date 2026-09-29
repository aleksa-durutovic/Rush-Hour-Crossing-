import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson, sendText } from './responses'
import { serveStaticFile } from './static'

export interface RequestHandlerOptions {
  /** Exact `Host` header values that may reach the server; anything else gets 403. */
  allowedHosts: readonly string[]
  /** Built frontend to serve (`dist/`). Without it only `/api` routes answer. */
  staticDir?: string
}

export type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void

export const HEALTH_RESPONSE = { status: 'ok', service: 'rush-hour-crossing-api' } as const

const READ_METHODS: readonly string[] = ['GET', 'HEAD']

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
}

export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  return (request, response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.setHeader(name, value)
    }

    if (!options.allowedHosts.includes(request.headers.host ?? '')) {
      sendJson(response, 403, { error: 'FORBIDDEN_HOST' })
      return
    }

    const pathname = readPathname(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      handleApi(request, response, pathname)
      return
    }

    if (!READ_METHODS.includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD')
      sendText(response, 405, 'Method not allowed')
      return
    }

    if (!options.staticDir) {
      sendText(response, 404, 'Not found')
      return
    }

    serveStaticFile(response, options.staticDir, pathname).catch(() => {
      if (response.headersSent) {
        response.destroy()
        return
      }
      sendText(response, 500, 'Internal server error')
    })
  }
}

function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string): void {
  response.setHeader('Cache-Control', 'no-store')

  if (pathname !== '/api/health') {
    sendJson(response, 404, { error: 'NOT_FOUND' })
    return
  }

  if (!READ_METHODS.includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, HEAD')
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' })
    return
  }

  sendJson(response, 200, HEALTH_RESPONSE)
}

function readPathname(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://127.0.0.1').pathname
  } catch {
    return ''
  }
}
