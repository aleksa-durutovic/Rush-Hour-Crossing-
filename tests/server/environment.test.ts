import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadServerEnvironment } from '../../server/environment'

const TEST_KEY = 'RHC_TEST_GEMINI_KEY'

let temporaryDirectory = ''
let priorValue: string | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  if (priorValue === undefined) {
    delete process.env[TEST_KEY]
  } else {
    process.env[TEST_KEY] = priorValue
  }
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    temporaryDirectory = ''
  }
})

describe('server local environment loading', () => {
  it('loads values from an explicitly supplied env file without printing them', async () => {
    priorValue = process.env[TEST_KEY]
    delete process.env[TEST_KEY]
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'rhc-env-'))
    const envPath = join(temporaryDirectory, '.env')
    await writeFile(envPath, TEST_KEY + '=fake-test-value\n')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => loadServerEnvironment(envPath)).not.toThrow()
    expect(process.env[TEST_KEY]).toBe('fake-test-value')
    expect(log).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('does nothing when the optional env file is absent', () => {
    priorValue = process.env[TEST_KEY]
    delete process.env[TEST_KEY]

    expect(() => loadServerEnvironment('/tmp/rhc-missing-feature-006.env')).not.toThrow()
    expect(process.env[TEST_KEY]).toBeUndefined()
  })
})
