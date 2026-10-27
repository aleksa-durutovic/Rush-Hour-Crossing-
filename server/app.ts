import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAdviceResponse, isCompletedRunSummary } from '../shared/advice-contract'
import { generationRequestSchema, generationResponseSchema, type GenerationResponse } from '../shared/level-generator-contract'
import { AdviceServiceError, type AdviceService } from './advice/service'
import { InvalidGenerationRequestError, type LevelGeneratorService } from './level-generator/service'
import { sendJson, sendText } from './responses'
import { serveStaticFile } from './static'
import { createAdmissionController, type AdmissionController, type AdmissionResult, type AiOperation } from './security/admission'
import { createSecurityEventStore, type SecurityEventStore, type SecurityOutcome, type SecurityReasonCode } from './security/events'

export interface RequestHandlerOptions {
  /** Exact Host header values that may reach the server; anything else gets 403. */
  allowedHosts: readonly string[]
  /** Exact browser Origin values allowed to submit AI requests. Missing Origin remains valid. */
  allowedOrigins?: readonly string[]
  admissionController?: AdmissionController
  securityEvents?: SecurityEventStore
  /** Built frontend to serve (dist/). Without it only /api routes answer. */
  staticDir?: string
  adviceService?: AdviceService
  generationService?: LevelGeneratorService
}

export type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void

export const HEALTH_RESPONSE = { status: 'ok', service: 'rush-hour-crossing-api' } as const

const READ_METHODS: readonly string[] = ['GET', 'HEAD']
const MAX_ADVICE_REQUEST_BYTES = 4096
const MAX_ADVICE_RESPONSE_BYTES = 4096
const MAX_GENERATION_REQUEST_BYTES = 2048
const MAX_GENERATION_RESPONSE_BYTES = 16_384
const ADVICE_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i
const GENERATION_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
}

const PRODUCTION_CONTENT_SECURITY_POLICY = [
  "default-src 'none'", "script-src 'self'", "style-src 'self'", "connect-src 'self'",
  "img-src 'self' data:", "font-src 'self'", "object-src 'none'", "base-uri 'none'",
  "frame-ancestors 'none'", "form-action 'none'",
].join('; ')

export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  const admissionController = options.admissionController ?? createAdmissionController()
  const securityEvents = options.securityEvents ?? createSecurityEventStore()
  const allowedOrigins = options.allowedOrigins ?? options.allowedHosts.map((host) => `http://${host}`)
  return (request, response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value)

    const pathname = readPathname(request.url)
    if (!options.allowedHosts.includes(request.headers.host ?? '')) {
      const operation = operationForPath(pathname)
      if (operation) denyAiRequest(response, securityEvents, operation, 403, 'FORBIDDEN_HOST', 'FORBIDDEN_HOST')
      else sendJson(response, 403, { error: 'FORBIDDEN_HOST' })
      return
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      handleApi(request, response, pathname, options.adviceService, options.generationService, allowedOrigins, admissionController, securityEvents)
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

    response.setHeader('Content-Security-Policy', PRODUCTION_CONTENT_SECURITY_POLICY)
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
  generationService?: LevelGeneratorService,
  allowedOrigins: readonly string[] = [],
  admissionController: AdmissionController = createAdmissionController(),
  securityEvents: SecurityEventStore = createSecurityEventStore(),
): void {
  response.setHeader('Cache-Control', 'no-store')

  if (pathname === '/api/advice') {
    handleAdvice(request, response, adviceService, allowedOrigins, admissionController, securityEvents).catch(() => {
      if (!response.destroyed && !response.headersSent) sendJson(response, 500, { error: 'INTERNAL_ERROR' })
    })
    return
  }

  if (pathname === '/api/levels/generate') {
    handleGenerate(request, response, generationService, allowedOrigins, admissionController, securityEvents).catch(() => {
      if (!response.destroyed && !response.headersSent) sendJson(response, 500, { error: 'INTERNAL_ERROR' })
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
  allowedOrigins: readonly string[] = [],
  admissionController: AdmissionController = createAdmissionController(),
  securityEvents: SecurityEventStore = createSecurityEventStore(),
): Promise<void> {
  const operation = 'advice' as const
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    denyAiRequest(response, securityEvents, operation, 405, 'METHOD_NOT_ALLOWED', 'METHOD_NOT_ALLOWED')
    return
  }
  if (!isAllowedOrigin(request.headers.origin, allowedOrigins)) {
    denyAiRequest(response, securityEvents, operation, 403, 'FORBIDDEN_ORIGIN', 'FORBIDDEN_ORIGIN')
    return
  }

  const contentType = request.headers['content-type']
  if (typeof contentType !== 'string' || !ADVICE_CONTENT_TYPE.test(contentType)) {
    denyAiRequest(response, securityEvents, operation, 415, 'UNSUPPORTED_MEDIA_TYPE', 'UNSUPPORTED_MEDIA_TYPE')
    return
  }
  const declaredLength = Number(request.headers['content-length'] ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ADVICE_REQUEST_BYTES) {
    request.resume()
    denyAiRequest(response, securityEvents, operation, 413, 'REQUEST_TOO_LARGE', 'REQUEST_TOO_LARGE')
    return
  }

  let body: Buffer
  try {
    body = await readBoundedBody(request, MAX_ADVICE_REQUEST_BYTES)
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      denyAiRequest(response, securityEvents, operation, 413, 'REQUEST_TOO_LARGE', 'REQUEST_TOO_LARGE')
    } else {
      denyAiRequest(response, securityEvents, operation, 400, 'INVALID_REQUEST', 'INVALID_REQUEST')
    }
    return
  }

  let value: unknown
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body)
    value = JSON.parse(text) as unknown
  } catch {
    denyAiRequest(response, securityEvents, operation, 400, 'INVALID_REQUEST', 'INVALID_REQUEST')
    return
  }
  if (!isCompletedRunSummary(value)) {
    denyAiRequest(response, securityEvents, operation, 400, 'INVALID_REQUEST', 'INVALID_REQUEST')
    return
  }
  if (!adviceService) {
    denyAiRequest(response, securityEvents, operation, 503, 'ADVICE_UNAVAILABLE', 'SERVICE_UNAVAILABLE')
    return
  }

  const admission = admissionController.tryAcquire(operation)
  if (!admission.accepted) {
    sendAdmissionDenial(response, operation, admission, securityEvents)
    return
  }
  const lease = admission.lease
  const job = securityEvents.createJob(operation, lease.correlationId)
  job.record('request_allowed', 'allowed', 'ALLOWED', 0, 0)
  const controller = new AbortController()
  const abortForDisconnect = (): void => controller.abort()
  const abortForResponseClose = (): void => {
    if (!response.writableEnded) controller.abort()
  }
  request.once('aborted', abortForDisconnect)
  response.once('close', abortForResponseClose)
  let terminalOutcome: SecurityOutcome = 'failed'
  let terminalReason: SecurityReasonCode = 'INTERNAL_ERROR'

  try {
    const advice = await adviceService.analyze(value, controller.signal, (kind, start) => lease.start(kind, start))
    if (response.destroyed || controller.signal.aborted) {
      terminalOutcome = 'cancelled'
      terminalReason = 'CANCELLED'
      return
    }
    if (!isAdviceResponse(advice) || Buffer.byteLength(JSON.stringify(advice), 'utf8') > MAX_ADVICE_RESPONSE_BYTES) {
      terminalReason = 'PROVIDER_UNAVAILABLE'
      sendJson(response, 503, { error: 'ADVICE_UNAVAILABLE' })
      return
    }
    terminalOutcome = 'completed'
    terminalReason = 'COMPLETED'
    sendJson(response, 200, advice)
  } catch (error) {
    if (response.destroyed || controller.signal.aborted) {
      terminalOutcome = 'cancelled'
      terminalReason = 'CANCELLED'
      return
    }
    if (error instanceof AdviceServiceError) {
      terminalReason = 'PROVIDER_UNAVAILABLE'
      sendJson(response, 503, { error: 'ADVICE_UNAVAILABLE' })
    } else {
      terminalReason = 'INTERNAL_ERROR'
      sendJson(response, 500, { error: 'INTERNAL_ERROR' })
    }
  } finally {
    request.off('aborted', abortForDisconnect)
    response.off('close', abortForResponseClose)
    job.record('run_finished', terminalOutcome, terminalReason, lease.providerAttempts, lease.executedToolCalls)
    lease.markTerminal()
  }
}

async function handleGenerate(
  request: IncomingMessage,
  response: ServerResponse,
  generationService: LevelGeneratorService | undefined,
  allowedOrigins: readonly string[] = [],
  admissionController: AdmissionController = createAdmissionController(),
  securityEvents: SecurityEventStore = createSecurityEventStore(),
): Promise<void> {
  const operation = 'generation' as const
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    denyAiRequest(response, securityEvents, operation, 405, 'METHOD_NOT_ALLOWED', 'METHOD_NOT_ALLOWED')
    return
  }
  if (!isAllowedOrigin(request.headers.origin, allowedOrigins)) {
    denyAiRequest(response, securityEvents, operation, 403, 'FORBIDDEN_ORIGIN', 'FORBIDDEN_ORIGIN')
    return
  }

  const contentType = request.headers['content-type']
  if (typeof contentType !== 'string' || !GENERATION_CONTENT_TYPE.test(contentType)) {
    denyAiRequest(response, securityEvents, operation, 415, 'UNSUPPORTED_MEDIA_TYPE', 'UNSUPPORTED_MEDIA_TYPE')
    return
  }
  const declaredLength = request.headers['content-length'] === undefined
    ? 0
    : Number(request.headers['content-length'])
  if (Number.isFinite(declaredLength) && declaredLength > MAX_GENERATION_REQUEST_BYTES) {
    request.resume()
    denyAiRequest(response, securityEvents, operation, 413, 'REQUEST_TOO_LARGE', 'REQUEST_TOO_LARGE')
    return
  }

  let body: Buffer
  try {
    body = await readBoundedBody(request, MAX_GENERATION_REQUEST_BYTES)
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      denyAiRequest(response, securityEvents, operation, 413, 'REQUEST_TOO_LARGE', 'REQUEST_TOO_LARGE')
    } else {
      denyAiRequest(response, securityEvents, operation, 400, 'INVALID_GENERATION_REQUEST', 'INVALID_REQUEST')
    }
    return
  }

  let parsedRequest: unknown
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body)
    parsedRequest = JSON.parse(text) as unknown
  } catch {
    denyAiRequest(response, securityEvents, operation, 400, 'INVALID_GENERATION_REQUEST', 'INVALID_REQUEST')
    return
  }
  const validatedRequest = generationRequestSchema.safeParse(parsedRequest)
  if (!validatedRequest.success) {
    denyAiRequest(response, securityEvents, operation, 400, 'INVALID_GENERATION_REQUEST', 'INVALID_REQUEST')
    return
  }
  if (!generationService) {
    denyAiRequest(response, securityEvents, operation, 500, 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE')
    return
  }

  const admission = admissionController.tryAcquire(operation)
  if (!admission.accepted) {
    sendAdmissionDenial(response, operation, admission, securityEvents)
    return
  }
  const lease = admission.lease
  const job = securityEvents.createJob(operation, lease.correlationId)
  job.record('request_allowed', 'allowed', 'ALLOWED', 0, 0)
  const controller = new AbortController()
  const abortForDisconnect = (): void => controller.abort()
  const abortForResponseClose = (): void => {
    if (!response.writableEnded) controller.abort()
  }
  request.once('aborted', abortForDisconnect)
  response.once('close', abortForResponseClose)
  let terminalOutcome: SecurityOutcome = 'failed'
  let terminalReason: SecurityReasonCode = 'INTERNAL_ERROR'

  try {
    const result = await generationService.generate(validatedRequest.data, controller.signal, (kind, start) => lease.start(kind, start))
    if (controller.signal.aborted || response.destroyed) {
      terminalOutcome = 'cancelled'
      terminalReason = 'CANCELLED'
      return
    }
    const validatedResponse = generationResponseSchema.safeParse(result)
    if (!validatedResponse.success) {
      sendJson(response, 500, { error: 'INTERNAL_ERROR' })
      return
    }
    const serialized = JSON.stringify(validatedResponse.data)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_GENERATION_RESPONSE_BYTES) {
      sendJson(response, 500, { error: 'INTERNAL_ERROR' })
      return
    }

    terminalReason = generationReasonCode(validatedResponse.data)
    terminalOutcome = terminalReason === 'COMPLETED' ? 'completed' : terminalReason === 'CANCELLED' ? 'cancelled' : 'failed'
    if (isToolDenialReason(terminalReason)) {
      job.record('tool_denied', 'denied', terminalReason, lease.providerAttempts, lease.executedToolCalls)
    }
    job.record('run_finished', terminalOutcome, terminalReason, lease.providerAttempts, lease.executedToolCalls)
    sendJson(response, 200, validatedResponse.data)
  } catch (error) {
    if (response.destroyed || controller.signal.aborted) {
      terminalOutcome = 'cancelled'
      terminalReason = 'CANCELLED'
      return
    }
    if (error instanceof InvalidGenerationRequestError) {
      terminalReason = 'INVALID_REQUEST'
      sendJson(response, 400, { error: 'INVALID_GENERATION_REQUEST' })
    } else {
      terminalReason = 'INTERNAL_ERROR'
      sendJson(response, 500, { error: 'INTERNAL_ERROR' })
    }
  } finally {
    request.off('aborted', abortForDisconnect)
    response.off('close', abortForResponseClose)
    if (terminalReason === 'CANCELLED' || terminalReason === 'INTERNAL_ERROR' || terminalReason === 'INVALID_REQUEST') {
      job.record('run_finished', terminalOutcome, terminalReason, lease.providerAttempts, lease.executedToolCalls)
    }
    lease.markTerminal()
  }
}
function operationForPath(pathname: string): AiOperation | null {
  if (pathname === '/api/advice') return 'advice'
  if (pathname === '/api/levels/generate') return 'generation'
  return null
}

function denyAiRequest(
  response: ServerResponse,
  events: SecurityEventStore,
  operation: AiOperation,
  status: number,
  error: string,
  reason: SecurityReasonCode,
): void {
  events.createJob(operation).record('request_denied', 'denied', reason, 0, 0)
  sendJson(response, status, { error })
}

function sendAdmissionDenial(
  response: ServerResponse,
  operation: AiOperation,
  result: Exclude<AdmissionResult, { accepted: true }>,
  events: SecurityEventStore,
): void {
  if (result.reason === 'busy') {
    denyAiRequest(response, events, operation, 409, operation === 'generation' ? 'GENERATION_BUSY' : 'ADVICE_BUSY', 'BUSY')
    return
  }
  response.setHeader('Retry-After', String(result.retryAfterSeconds ?? 1))
  denyAiRequest(response, events, operation, 429, 'AI_RATE_LIMITED', 'RATE_LIMITED')
}

function generationReasonCode(response: GenerationResponse): SecurityReasonCode {
  if (response.completed && response.status === 'completed') return 'COMPLETED'
  switch (response.stopReason) {
    case 'unknown_tool': return 'TOOL_NOT_ALLOWED'
    case 'invalid_tool_arguments': return 'INVALID_TOOL_ARGUMENTS'
    case 'invalid_tool_result': return 'INVALID_TOOL_RESULT'
    case 'invalid_final_selection':
    case 'final_verification_failed': return 'INVALID_FINAL_SELECTION'
    case 'deadline': return 'DEADLINE'
    case 'cancelled': return 'CANCELLED'
    default: return 'PROVIDER_UNAVAILABLE'
  }
}

function isToolDenialReason(reason: SecurityReasonCode): boolean {
  return reason === 'TOOL_NOT_ALLOWED' || reason === 'INVALID_TOOL_ARGUMENTS' ||
    reason === 'INVALID_TOOL_RESULT' || reason === 'INVALID_FINAL_SELECTION'
}
class RequestTooLargeError extends Error {}

function isAllowedOrigin(origin: string | string[] | undefined, allowedOrigins: readonly string[]): boolean {
  if (origin === undefined) return true
  return typeof origin === 'string' && allowedOrigins.includes(origin)
}

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
