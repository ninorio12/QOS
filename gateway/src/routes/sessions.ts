import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'

export function makeSessionsRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  // POST /sessions/:agent/send  { message: string }
  router.post('/:agent/send', async (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }

    const { message } = req.body as { message?: string }
    if (!message) { res.status(400).json({ error: 'Missing message' }); return }

    const response = await sessions[agent].send(message)
    res.json({ agent, response })
  })

  return router
}
