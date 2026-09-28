import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRequestHandler, HEALTH_RESPONSE } from '../../server/app'
import { allowedHostsFor } from '../../server/config'

interface RawResponse {
  status: number
  headers: IncomingHttpHeaders
  body: string
}

interface RunningServer {
  server: Server
  port: number
}

const INDEX_HTML = '<!doctype html><title>fixture</title>'
const APP_JS = 'console.log("fixture")'
const SECRET = '{"secret":"outside the static root"}'

const NOT_FOUND_PATHS: string[] = [
  '/missing.html',
  '/assets',
  '/assets/notes.txt',
  '/..%2fsecret.json',
  '/%2e%2e/secret.json',
  '/..%5csecret.json',
  '/%2Fsecret.json',
  '/%E0%A4%A',
]

let tempDir = ''
let withStatic: RunningServer
let apiOnly: RunningServer

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'rhc-server-'))
  const staticDir = join(tempDir, 'public')
  await mkdir(join(staticDir, 'assets'), { recursive: true })
  await writeFile(join(staticDir, 'index.html'), INDEX_HTML)
  await writeFile(join(staticDir, 'assets', 'app.js'), APP_JS)
  await writeFile(join(staticDir, 'assets', 'notes.txt'), 'not on the allowlist')
  await writeFile(join(tempDir, 'secret.json'), SECRET)
  withStatic = await startServer(staticDir)
  apiOnly = await startServer(undefined)
})

afterAll(async () => {
  await stopServer(withStatic.server)
  await stopServer(apiOnly.server)
  await rm(tempDir, { recursive: true, force: true })
})

async function startServer(staticDir: string | undefined): Promise<RunningServer> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  server.on('request', createRequestHandler({ allowedHosts: allowedHostsFor(port), staticDir }))
  return { server, port }
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
}

function send(
  target: RunningServer,
  method: string,
  path: string,
  host = `127.0.0.1:${target.port}`,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const outgoing = request(
      { host: '127.0.0.1', port: target.port, method, path, headers: { host }, agent: false },
      (incoming) => {
        const chunks: Buffer[] = []
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
        incoming.on('end', () =>
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        )
      },
    )
    outgoing.on('error', reject)
    outgoing.end()
  })
}

describe('API routes', () => {
  it('GET /api/health returns the health body as JSON', async () => {
    const response = await send(apiOnly, 'GET', '/api/health')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.parse(response.body)).toEqual({ status: 'ok', service: 'rush-hour-crossing-api' })
    expect(JSON.parse(response.body)).toEqual(HEALTH_RESPONSE)
  })

  it('HEAD /api/health returns the headers without a body', async () => {
    const response = await send(apiOnly, 'HEAD', '/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toBe('')
  })

  it('rejects other methods on /api/health with a JSON 405', async () => {
    const response = await send(apiOnly, 'POST', '/api/health')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(JSON.parse(response.body)).toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it.each(['/api', '/api/unknown', '/api/health/extra'])('answers the unknown API route %s with a JSON 404', async (path) => {
    const response = await send(withStatic, 'GET', path)

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(JSON.parse(response.body)).toEqual({ error: 'NOT_FOUND' })
  })

  it('sends the security headers and no CORS header', async () => {
    const response = await send(apiOnly, 'GET', '/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('Host allowlist', () => {
  it('accepts localhost with the server port', async () => {
    const response = await send(apiOnly, 'GET', '/api/health', `localhost:${apiOnly.port}`)

    expect(response.status).toBe(200)
  })

  it.each(['evil.example', 'evil.example:8787', '127.0.0.1', 'localhost:1'])('rejects the Host header %s with 403', async (host) => {
    const response = await send(apiOnly, 'GET', '/api/health', host)

    expect(response.status).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: 'FORBIDDEN_HOST' })
  })

  it('checks the Host header before serving static files', async () => {
    const response = await send(withStatic, 'GET', '/', 'evil.example')

    expect(response.status).toBe(403)
    expect(response.body).not.toContain('fixture')
  })
})

describe('static files', () => {
  it('serves index.html for /', async () => {
    const response = await send(withStatic, 'GET', '/')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.body).toBe(INDEX_HTML)
  })

  it('ignores the query string', async () => {
    const response = await send(withStatic, 'GET', '/?difficulty=hard&lives=2')

    expect(response.status).toBe(200)
    expect(response.body).toBe(INDEX_HTML)
  })

  it('serves a built script with a JavaScript content type', async () => {
    const response = await send(withStatic, 'GET', '/assets/app.js')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/javascript; charset=utf-8')
    expect(response.body).toBe(APP_JS)
  })

  it.each(NOT_FOUND_PATHS)('answers %s with 404 and never leaks files', async (path) => {
    const response = await send(withStatic, 'GET', path)

    expect(response.status).toBe(404)
    expect(response.body).toBe('Not found')
    expect(response.body).not.toContain('secret')
  })

  it('rejects non-read methods for static paths with 405', async () => {
    const response = await send(withStatic, 'POST', '/')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(response.body).toBe('Method not allowed')
  })

  it('serves no files when no static directory is configured', async () => {
    const response = await send(apiOnly, 'GET', '/')

    expect(response.status).toBe(404)
    expect(response.body).toBe('Not found')
  })
})
