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
    const importers = typeScriptFiles('server')
      .filter((file) => importSpecifiers(file).includes('@google/genai'))
      .map((file) => file.replaceAll('\\', '/'))
    expect(importers).toEqual(['server/advice/gemini-provider.ts'])
  })

  it('keeps backup profile policy free of SDK and environment access', () => {
    const files = typeScriptFiles('server/ai').map((file) => file.replaceAll('\\', '/'))
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return [
        ...(importSpecifiers(file).includes('@google/genai') ? [`${file} imports Gemini SDK`] : []),
        ...(source.includes('process.env') ? [`${file} reads environment`] : []),
      ]
    })
    expect(violations).toEqual([])
  })

  it('keeps environment values within the server entry point and provider adapter', () => {
    const readers = typeScriptFiles('server')
      .filter((file) => readFileSync(file, 'utf8').includes('process.env'))
      .map((file) => file.replaceAll('\\', '/'))
      .sort()
    expect(readers).toEqual(['server/advice/gemini-provider.ts', 'server/index.ts'])
  })

  it('src/ never reads environment variables', () => {
    const readers = typeScriptFiles('src').filter((file) => {
      const source = readFileSync(file, 'utf8')
      return source.includes('process.env') || source.includes('import.meta.env')
    })

    expect(readers).toEqual([])
  })

  it('pure generated-level search and metrics contain no browser, clock, randomness or Node dependencies', () => {
    const files = [...typeScriptFiles('src/game'), 'src/config/generated-level.ts']
    const forbiddenSources = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const found: string[] = []
      if (/\b(document|window)\b/.test(source)) found.push(`${file} references browser globals`)
      if (/\b(?:Date\.now|performance\.now|Math\.random)\b/.test(source)) found.push(`${file} references clock or randomness`)
      if (importSpecifiers(file).some((specifier) => specifier.startsWith('node:') || NODE_BUILTINS.includes(specifier))) {
        found.push(`${file} imports Node.js`)
      }
      return found
    })
    expect(forbiddenSources).toEqual([])
  })

  it('generator policy and solver tool keep SDK and environment access behind the provider boundary', () => {
    const files = typeScriptFiles('server/level-generator')
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return [
        ...(importSpecifiers(file).includes('@google/genai') ? [`${file} imports Gemini SDK`] : []),
        ...(source.includes('process.env') ? [`${file} reads environment`] : []),
      ]
    })
    expect(violations).toEqual([])
  })
})
