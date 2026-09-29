import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const NODE_BUILTINS: readonly string[] = ['fs', 'path', 'http', 'https', 'net', 'os', 'child_process', 'crypto', 'process']

function typeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(directory, file))
}

function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return Array.from(source.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g), (match) => match[1])
}

function violations(directory: string, isForbidden: (specifier: string) => boolean): string[] {
  return typeScriptFiles(directory).flatMap((file) =>
    importSpecifiers(file)
      .filter(isForbidden)
      .map((specifier) => `${file} imports ${specifier}`),
  )
}

describe('frontend and backend boundaries', () => {
  it('src/ never imports server code or Node.js built-ins', () => {
    expect(
      violations(
        'src',
        (specifier) =>
          specifier.startsWith('node:') ||
          NODE_BUILTINS.includes(specifier) ||
          /(^|\/)server(\/|$)/.test(specifier),
      ),
    ).toEqual([])
  })

  it('server/ never imports browser-only modules', () => {
    expect(
      violations(
        'server',
        (specifier) => /(^|\/)src\/(main|render|input)(\/|\.|$)/.test(specifier) || specifier.endsWith('.css'),
      ),
    ).toEqual([])
  })

  it('src/ never imports the Gemini SDK', () => {
    expect(violations('src', (specifier) => specifier === '@google/genai')).toEqual([])
  })

  it('only the Gemini provider adapter imports the SDK', () => {
    const importers = typeScriptFiles('server').filter((file) => importSpecifiers(file).includes('@google/genai'))
    expect(importers).toEqual(['server/advice/gemini-provider.ts'])
  })

  it('src/ never reads environment variables', () => {
    const readers = typeScriptFiles('src').filter((file) => {
      const source = readFileSync(file, 'utf8')
      return source.includes('process.env') || source.includes('import.meta.env')
    })

    expect(readers).toEqual([])
  })
})
