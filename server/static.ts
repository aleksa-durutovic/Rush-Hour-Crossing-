import { readFile, stat } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { sendText } from './responses'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

/**
 * Maps a URL pathname to a file inside `rootDir`. Returns `null` when the path is
 * malformed, leaves `rootDir`, or has a file type that is not on the allowlist.
 */
export function resolveStaticPath(rootDir: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  if (decoded.includes('\0')) {
    return null
  }

  const root = resolve(rootDir)
  const filePath = resolve(root, decoded === '/' ? 'index.html' : decoded.slice(1))
  if (!filePath.startsWith(root + sep) || !Object.hasOwn(CONTENT_TYPES, extname(filePath).toLowerCase())) {
    return null
  }

  return filePath
}

export async function serveStaticFile(response: ServerResponse, rootDir: string, pathname: string): Promise<void> {
  const filePath = resolveStaticPath(rootDir, pathname)
  if (!filePath || !(await isFile(filePath))) {
    sendText(response, 404, 'Not found')
    return
  }

  const body = await readFile(filePath)
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()],
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  })
  response.end(body)
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}
