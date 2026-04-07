import { Router, type Request, type Response } from 'express'
import { eventBus } from '../EventBus'

export function makeEventsRouter(): Router {
  const router = Router()

  router.get('/', (req: Request, res: Response) => {
    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.setHeader('Connection',    'keep-alive')
    res.flushHeaders()

    let eventId = 0

    function send(data: object): void {
      res.write(`id: ${eventId++}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    send({ type: 'connected', msg: 'OpenClaw SSE stream connected', timestamp: new Date().toISOString() })

    const unsub = eventBus.subscribe((event) => send(event))

    req.on('close', () => {
      unsub()
      res.end()
    })
  })

  return router
}
