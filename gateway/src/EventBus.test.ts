import { describe, it, expect } from 'vitest'
import { EventBus } from './EventBus'

describe('EventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EventBus()
    const received: unknown[] = []
    bus.subscribe((e) => received.push(e))
    bus.emit({ type: 'sms', from: 'Kai', to: 'Twilio', msg: 'test', timestamp: 'now' })
    expect(received).toHaveLength(1)
    expect((received[0] as { type: string }).type).toBe('sms')
  })

  it('unsubscribe stops delivery', () => {
    const bus = new EventBus()
    const received: unknown[] = []
    const unsub = bus.subscribe((e) => received.push(e))
    unsub()
    bus.emit({ type: 'webhook', from: 'A', to: 'B', msg: 'x', timestamp: 'now' })
    expect(received).toHaveLength(0)
  })

  it('multiple subscribers all receive events', () => {
    const bus = new EventBus()
    const a: unknown[] = []
    const b: unknown[] = []
    bus.subscribe((e) => a.push(e))
    bus.subscribe((e) => b.push(e))
    bus.emit({ type: 'delegate', from: 'Soren', to: 'Kai', msg: 'test', timestamp: 'now' })
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })
})
