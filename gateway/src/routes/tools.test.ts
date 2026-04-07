import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { makeToolsRouter } from './tools'
import type { AgentName } from '../config'

const disableFn        = vi.fn()
const enableFn         = vi.fn()
const getActiveToolsFn = vi.fn().mockReturnValue(['tool_a', 'tool_b'])

const mockSessions = {
  kai: {
    disableTool:        disableFn,
    enableTool:         enableFn,
    getActiveToolNames: getActiveToolsFn,
  },
} as unknown as Record<AgentName, unknown>

const app = express()
app.use(express.json())
app.use('/agents', makeToolsRouter(mockSessions as never))

let server: ReturnType<typeof app.listen>
let port: number

beforeAll(() => new Promise<void>(resolve => {
  server = app.listen(0, () => {
    port = (server.address() as { port: number }).port
    resolve()
  })
}))

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))

describe('makeToolsRouter', () => {
  it('returns 404 for unknown agent', async () => {
    const res = await fetch(
      `http://localhost:${port}/agents/unknown/tools/twilio_send_sms/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: false }),
      }
    )
    expect(res.status).toBe(404)
  })

  it('calls disableTool when enabled:false', async () => {
    vi.clearAllMocks()
    getActiveToolsFn.mockReturnValue(['tool_a'])
    const res = await fetch(
      `http://localhost:${port}/agents/kai/tools/twilio_send_sms/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: false }),
      }
    )
    expect(res.ok).toBe(true)
    const data = await res.json() as { ok: boolean; enabled: boolean }
    expect(data.ok).toBe(true)
    expect(data.enabled).toBe(false)
    expect(disableFn).toHaveBeenCalledWith('twilio_send_sms')
    expect(enableFn).not.toHaveBeenCalled()
  })

  it('calls enableTool when enabled:true', async () => {
    vi.clearAllMocks()
    getActiveToolsFn.mockReturnValue(['tool_a', 'twilio_send_sms'])
    const res = await fetch(
      `http://localhost:${port}/agents/kai/tools/twilio_send_sms/toggle`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: true }),
      }
    )
    expect(res.ok).toBe(true)
    expect(enableFn).toHaveBeenCalledWith('twilio_send_sms')
    expect(disableFn).not.toHaveBeenCalled()
  })
})
