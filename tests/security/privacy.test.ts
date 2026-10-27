import { describe, expect, it, vi } from 'vitest'
import { createSecurityEventStore } from '../../server/security/events'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { W08_SYNTHETIC_SECRET, validAdviceSummary, validGenerationRequest } from './fixtures'

const exactKeys = [
  'event', 'timestamp', 'correlationId', 'operation', 'outcome', 'reasonCode', 'providerAttempts', 'executedToolCalls',
]

describe('T21 projected security event retention', () => {
  it('projects exactly eight fields and caps each job at 32 events', () => {
    const store = createSecurityEventStore({
      now: () => new Date('2026-10-27T12:00:00.000Z'),
      createCorrelationId: () => 'synthetic-job-id',
    })
    const job = store.createJob('generation')
    for (let index = 0; index < 33; index += 1) {
      job.record('request_denied', 'denied', 'INVALID_REQUEST', 0, 0)
    }

    expect(store.snapshot()).toHaveLength(32)
    expect(Object.keys(store.snapshot()[0] ?? {})).toEqual(exactKeys)
    expect(store.snapshot()[0]).toMatchObject({
      event: 'request_denied',
      timestamp: '2026-10-27T12:00:00.000Z',
      correlationId: 'synthetic-job-id',
      operation: 'generation',
      outcome: 'denied',
      reasonCode: 'INVALID_REQUEST',
      providerAttempts: 0,
      executedToolCalls: 0,
    })
  })

  it('retains only the newest 128 events across jobs and isolates a throwing sink', () => {
    const sink = vi.fn(() => { throw new Error('synthetic diagnostics failure') })
    let id = 0
    const store = createSecurityEventStore({
      now: () => new Date('2026-10-27T12:00:00.000Z'),
      createCorrelationId: () => 'job-' + (++id),
      onEvent: sink,
    })
    for (let jobNumber = 0; jobNumber < 5; jobNumber += 1) {
      const job = store.createJob('advice')
      for (let index = 0; index < 32; index += 1) {
        expect(() => job.record('run_finished', 'completed', 'COMPLETED', 2, 0)).not.toThrow()
      }
    }

    const events = store.snapshot()
    expect(events).toHaveLength(128)
    expect(events[0]?.correlationId).toBe('job-2')
    expect(events.at(-1)?.correlationId).toBe('job-5')
    expect(sink).toHaveBeenCalledTimes(160)
    expect(events.every((event) => Object.keys(event).join('|') === exactKeys.join('|'))).toBe(true)
  })

  it('rejects out-of-contract counters and does not accept externally supplied correlation IDs', () => {
    const store = createSecurityEventStore({ createCorrelationId: () => 'server-generated-id' })
    const job = store.createJob('advice', 'client supplied newline\n{"event":"forged"}')
    expect(job.correlationId).toBe('server-generated-id')
    expect(job.record('run_finished', 'completed', 'COMPLETED', 7, 0)).toBeNull()
    expect(job.record('run_finished', 'completed', 'COMPLETED', 1, 9)).toBeNull()
    expect(store.snapshot()).toHaveLength(0)
  })
})

describe('T21-T23 HTTP event projection and sentinel isolation', () => {
  it('captures one zero-work denial and actual allowed/terminal advice events', async () => {
    const fixture = await startW08Server()
    try {
      const denied = await fetch(fixture.origin + '/api/advice', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://evil.example' },
        body: JSON.stringify(validAdviceSummary),
      })
      expect(denied.status).toBe(403)
      expect(fixture.sdkCalls).toHaveLength(0)
      expect(fixture.securityEvents[0]).toMatchObject({
        event: 'request_denied', operation: 'advice', outcome: 'denied', reasonCode: 'FORBIDDEN_ORIGIN',
        providerAttempts: 0, executedToolCalls: 0,
      })

      const allowed = await fetch(fixture.origin + '/api/advice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validAdviceSummary),
      })
      expect(allowed.status).toBe(200)
      expect(fixture.securityEvents.slice(1).map((event) => event.event)).toEqual(['request_allowed', 'run_finished'])
      expect(fixture.securityEvents[2]).toMatchObject({
        outcome: 'completed', reasonCode: 'COMPLETED', providerAttempts: 1, executedToolCalls: 0,
      })
      expect(fixture.securityEvents.every((event) => Object.keys(event).join('|') === exactKeys.join('|'))).toBe(true)
    } finally {
      await fixture.close()
    }
  })

  it('does not let a failing event sink change a real advice response', async () => {
    const fixture = await startW08Server({ onSecurityEvent: () => { throw new Error('synthetic sink failure') } })
    try {
      const response = await fetch(fixture.origin + '/api/advice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validAdviceSummary),
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ nextTip: 'Wait for a clear gap.' })
    } finally {
      await fixture.close()
    }
  })

  it('keeps the synthetic SDK key inside the injected factory and omits it from HTTP, model contexts, and events', async () => {
    const fixture = await startW08Server({ apiKey: W08_SYNTHETIC_SECRET })
    try {
      const response = await fetch(fixture.origin + '/api/levels/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validGenerationRequest),
      })
      const body = await response.text()
      expect(response.status).toBe(200)
      expect(fixture.receivedApiKeys).toContain(W08_SYNTHETIC_SECRET)
      expect(body).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.modelContexts)).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.securityEvents)).not.toContain(W08_SYNTHETIC_SECRET)
    } finally {
      await fixture.close()
    }
  })

  it('redacts a sentinel-bearing adapter error and newline-bearing unknown tool name', async () => {
    let fixture: W08ServerFixture = await startW08Server({
      generateContent: () => { throw new Error('adapter failure ' + W08_SYNTHETIC_SECRET) },
    })
    try {
      const response = await fetch(fixture.origin + '/api/levels/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validGenerationRequest),
      })
      const body = await response.text()
      expect(body).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.securityEvents)).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.modelContexts)).not.toContain(W08_SYNTHETIC_SECRET)
    } finally {
      await fixture.close()
    }

    fixture = await startW08Server({ decide: () => ({
      kind: 'tool_request', name: W08_SYNTHETIC_SECRET, arguments: { lanes: [] },
    }) })
    try {
      const response = await fetch(fixture.origin + '/api/levels/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validGenerationRequest),
      })
      const body = await response.text()
      expect(response.status).toBe(200)
      expect(body).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.securityEvents)).not.toContain(W08_SYNTHETIC_SECRET)
      expect(JSON.stringify(fixture.modelContexts)).not.toContain(W08_SYNTHETIC_SECRET)
      expect(fixture.solverStarts).toHaveLength(0)
    } finally {
      await fixture.close()
    }
    const safeLogs: string[] = []
    fixture = await startW08Server({ decide: () => ({
      kind: 'tool_request', name: 'x\n{"event":"run_finished"}', arguments: { lanes: [] },
    }), onSecurityEvent: (event) => safeLogs.push('Security event ' + JSON.stringify(event)) })
    try {
      const response = await fetch(fixture.origin + '/api/levels/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validGenerationRequest),
      })
      const body = await response.text()
      expect(response.status).toBe(200)
      expect(body).not.toContain('run_finished')
      expect(fixture.securityEvents.map((event) => event.event)).toEqual(['request_allowed', 'tool_denied', 'run_finished'])
      expect(fixture.securityEvents.every((event) => Object.keys(event).join('|') === exactKeys.join('|'))).toBe(true)
      expect(JSON.stringify(fixture.securityEvents)).not.toContain('x\\n')
      expect(JSON.stringify(fixture.securityEvents)).not.toContain('{"event":"run_finished"}')
      expect(safeLogs).toHaveLength(3)
      expect(safeLogs.join('\n').split('\n')).toHaveLength(3)
      expect(safeLogs.every((line) => line.startsWith('Security event {'))).toBe(true)
      expect(fixture.solverStarts).toHaveLength(0)
    } finally {
      await fixture.close()
    }
  })
})