import { describe, expect, it } from 'vitest'
import { allowedHostsFor, DEFAULT_PORT, readServerConfig } from '../../server/config'

const PORT_ERROR = /^Invalid PORT: expected an integer from 1024 to 65535\.$/

const ACCEPTED_PORTS: [string, number][] = [
  ['1024', 1024],
  ['4173', 4173],
  ['65535', 65535],
]

const REJECTED_PORTS: string[] = ['0', '1023', '65536', 'abc', '80.5', '-1', ' 4173', '1e4']

describe('server config', () => {
  it('uses 127.0.0.1:8787 when PORT is missing', () => {
    expect(DEFAULT_PORT).toBe(8787)
    expect(readServerConfig({})).toEqual({ host: '127.0.0.1', port: 8787 })
  })

  it('uses the default port when PORT is empty', () => {
    expect(readServerConfig({ PORT: '' })).toEqual({ host: '127.0.0.1', port: 8787 })
  })

  it.each(ACCEPTED_PORTS)('accepts PORT=%s', (value, port) => {
    expect(readServerConfig({ PORT: value })).toEqual({ host: '127.0.0.1', port })
  })

  it.each(REJECTED_PORTS)('rejects PORT="%s" with a fixed message', (value) => {
    expect(() => readServerConfig({ PORT: value })).toThrow(PORT_ERROR)
  })

  it('allows only the loopback Host values for a port', () => {
    expect(allowedHostsFor(4173)).toEqual(['127.0.0.1:4173', 'localhost:4173'])
  })
})
