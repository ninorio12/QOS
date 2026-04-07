export interface GatewayEvent {
  type: string
  from: string
  to:   string
  msg:  string
  timestamp: string
  [key: string]: unknown
}

type Subscriber = (event: GatewayEvent) => void

export class EventBus {
  private subscribers = new Set<Subscriber>()

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  emit(event: GatewayEvent): void {
    for (const fn of this.subscribers) {
      fn(event)
    }
  }
}

// Singleton for use across the gateway
export const eventBus = new EventBus()
