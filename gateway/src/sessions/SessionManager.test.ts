import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: mockCreate }
  },
}))
vi.mock('../config', () => ({
  config: {
    anthropicKey: 'test',
    agents: {
      kai: { model: 'claude-sonnet-4-6', soul: 'You are Kai', skills: [] },
    },
  },
}))
vi.mock('../EventBus', () => ({
  eventBus: { emit: vi.fn() },
}))

describe('SessionManager', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sends message and returns text response', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Bonjour Thomas !' }],
    })
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    const result = await sm.send('Bonjour')
    expect(result).toBe('Bonjour Thomas !')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-sonnet-4-6',
      system: 'You are Kai',
    }))
  })

  it('executes tool_use and loops until end_turn', async () => {
    const toolCallback = vi.fn().mockResolvedValue({ ok: true })
    mockCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'test_tool', input: { x: 1 } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done' }],
      })

    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool('test_tool', { description: 'A test tool', input_schema: { type: 'object' as const, properties: {} } }, toolCallback)
    const result = await sm.send('Do something')
    expect(toolCallback).toHaveBeenCalledWith({ x: 1 })
    expect(result).toBe('Done')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('updateSoul changes the system prompt used in subsequent calls', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'New soul response' }],
    })
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.updateSoul('You are a NEW version of Kai')
    await sm.send('Test')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      system: 'You are a NEW version of Kai',
    }))
  })

  it('disableTool removes a tool from active tools', async () => {
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool(
      'test_tool',
      { description: 'test', input_schema: { type: 'object' as const, properties: {} } },
      async () => ({})
    )
    expect(sm.getActiveToolNames()).toContain('test_tool')
    sm.disableTool('test_tool')
    expect(sm.getActiveToolNames()).not.toContain('test_tool')
  })

  it('enableTool restores a previously disabled tool', async () => {
    const { SessionManager } = await import('./SessionManager')
    const sm = new SessionManager('kai')
    sm.registerTool(
      'test_tool',
      { description: 'test', input_schema: { type: 'object' as const, properties: {} } },
      async () => ({})
    )
    sm.disableTool('test_tool')
    sm.enableTool('test_tool')
    expect(sm.getActiveToolNames()).toContain('test_tool')
  })
})
