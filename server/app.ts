import type { IncomingMessage, ServerResponse } from 'node:http'
import { isCompletedRunSummary } from '../shared/advice-contract'
import {
  HINT_REQUEST_MAX_BYTES,
  HINT_RESPONSE_MAX_BYTES,
  isHintResponse,
  isHintSnapshot,
} from '../shared/hint-agent-contract'
import { AdviceServiceError, type AdviceService } from './advice/service'
import { type HintService } from './agent/hint-service'
import { sendJson, sendText } from './responses'
import { serveStaticFile } from './static'

export interface RequestHandlerOptions {
  /** Exact Host header values that may reach the server; anything else gets 403. */
  allowedHosts: readonly string[]
  /** Built frontend to serve (dist/). Without it only /api routes answer. */
  staticDir?: string
  adviceService?: AdviceService
  hintService?: HintService
}

export type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void

export const HEALTH_RESPONSE = { status: 'ok', service: 'rush-hour-crossing-api' } as const

const READ_METHODS: readonly string[] = ['GET', 'HEAD']
const MAX_ADVICE_REQUEST_BYTES = 4096
const ADVICE_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
}

export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  return (request, response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value)

    if (!options.allowedHosts.includes(request.headers.host ?? '')) {
      sendJson(response, 403, { error: 'FORBIDDEN_HOST' })
      return
    }

    const pathname = readPathname(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      handleApi(request, response, pathname, options.adviceService, options.hintService)
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

function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  adviceService?: AdviceService,
  hintService?: HintService,
): void {
  response.setHeader('Cache-Control', 'no-store')

  if (pathname === '/api/advice') {
    handleAdvice(request, response, adviceService).catch(() => {
      if (!response.destroyed && !response.headersSent) sendJson(response, 500, { error: 'INTERNAL_ERROR' })
    })
    return
  }

  if (pathname === '/api/hint') {
    handleHint(request, response, hintService).catch(() => {
      if (!response.destroyed && !response.headersSent) sendJson(response, 503, { error: 'HINT_UNAVAILABLE' })
    })
    return
  }

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

async function handleAdvice(
  request: IncomingMessage,
  response: ServerResponse,
  adviceService?: AdviceService,
): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' })
    return
  }

  const contentType = request.headers['content-type']
  if (typeof contentType !== 'string' || !ADVICE_CONTENT_TYPE.test(contentType)) {
    sendJson(response, 415, { error: 'UNSUPPORTED_MEDIA_TYPE' })
    return
  }

  const declaredLength = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ADVICE_REQUEST_BYTES) {
    request.resume()
    sendJson(response, 413, { error: 'REQUEST_TOO_LARGE' })
    return
  }

  let body: Buffer
  try {
    body = await readBoundedBody(request, MAX_ADVICE_REQUEST_BYTES)
  } catch (error) {
    if (error instanceof RequestTooLargeError) sendJson(response, 413, { error: 'REQUEST_TOO_LARGE' })
    else sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }

  let value: unknown
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body)
    value = JSON.parse(text) as unknown
  } catch {
    sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }

  if (!isCompletedRunSummary(value)) {
    sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }
  if (!adviceService) {
    sendJson(response, 503, { error: 'ADVICE_UNAVAILABLE' })
    return
  }

  const controller = new AbortController()
  const abortForDisconnect = (): void => controller.abort()
  const abortForResponseClose = (): void => {
    if (!response.writableEnded) controller.abort()
  }
  request.once('aborted', abortForDisconnect)
  response.once('close', abortForResponseClose)

  try {
    const advice = await adviceService.analyze(value, controller.signal)
    if (!response.destroyed) sendJson(response, 200, advice)
  } catch (error) {
    if (response.destroyed) return
    if (error instanceof AdviceServiceError) sendJson(response, 503, { error: 'ADVICE_UNAVAILABLE' })
    else sendJson(response, 500, { error: 'INTERNAL_ERROR' })
  } finally {
    request.off('aborted', abortForDisconnect)
    response.off('close', abortForResponseClose)
  }
}

async function handleHint(
  request: IncomingMessage,
  response: ServerResponse,
  hintService?: HintService,
): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' })
    return
  }

  const contentType = request.headers['content-type']
  if (typeof contentType !== 'string' || !ADVICE_CONTENT_TYPE.test(contentType)) {
    sendJson(response, 415, { error: 'UNSUPPORTED_MEDIA_TYPE' })
    return
  }

  const declaredLength = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > HINT_REQUEST_MAX_BYTES) {
    request.resume()
    sendJson(response, 413, { error: 'REQUEST_TOO_LARGE' })
    return
  }

  let body: Buffer
  try {
    body = await readBoundedBody(request, HINT_REQUEST_MAX_BYTES)
  } catch (error) {
    if (error instanceof RequestTooLargeError) sendJson(response, 413, { error: 'REQUEST_TOO_LARGE' })
    else sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }

  let value: unknown
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown
  } catch {
    sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }

  if (!isHintSnapshot(value)) {
    sendJson(response, 400, { error: 'INVALID_REQUEST' })
    return
  }
  if (!hintService) {
    sendJson(response, 503, { error: 'HINT_UNAVAILABLE' })
    return
  }

  const controller = new AbortController()
  const abortForDisconnect = (): void => controller.abort()
  const abortForResponseClose = (): void => {
    if (!response.writableEnded) controller.abort()
  }
  request.once('aborted', abortForDisconnect)
  response.once('close', abortForResponseClose)

  try {
    const hint = await hintService.analyze(value, controller.signal)
    const serialized = JSON.stringify(hint)
    if (
      !isHintResponse(hint, value) ||
      Buffer.byteLength(serialized, 'utf8') > HINT_RESPONSE_MAX_BYTES
    ) {
      sendJson(response, 503, { error: 'HINT_UNAVAILABLE' })
      return
    }
    if (!response.destroyed) sendJson(response, 200, hint)
  } catch {
    if (response.destroyed) return
    sendJson(response, 503, { error: 'HINT_UNAVAILABLE' })
  } finally {
    request.off('aborted', abortForDisconnect)
    response.off('close', abortForResponseClose)
  }
}

class RequestTooLargeError extends Error {}

function readBoundedBody(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let complete = false
    const cleanup = (): void => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
      request.off('aborted', onAborted)
    }
    const fail = (error: Error): void => {
      if (complete) return
      complete = true
      cleanup()
      reject(error)
    }
    const onData = (chunk: Buffer | string): void => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.byteLength
      if (size > maximumBytes) {
        request.resume()
        fail(new RequestTooLargeError())
        return
      }
      chunks.push(bytes)
    }
    const onEnd = (): void => {
      if (complete) return
      complete = true
      cleanup()
      resolve(Buffer.concat(chunks))
    }
    const onError = (): void => fail(new Error('Request body failed.'))
    const onAborted = (): void => fail(new Error('Request aborted.'))

    request.on('data', onData)
    request.once('end', onEnd)
    request.once('error', onError)
    request.once('aborted', onAborted)
  })
}

function readPathname(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://127.0.0.1').pathname
  } catch {
    return ''
  }
}
