import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'

export function makeToolsRouter(sessions: Record<AgentName, SessionManager>): Router {
  const router = Router()

  // POST /agents/:agent/tools/:tool/toggle
  // Body: { enabled: boolean }
  router.post('/:agent/tools/:tool/toggle', (req, res) => {
    const agent = req.params.agent as AgentName
    const tool  = req.params.tool
    const { enabled } = req.body as { enabled: boolean }

    if (!sessions[agent]) {
      res.status(404).json({ error: 'Unknown agent' })
      return
    }

    if (enabled) {
      sessions[agent].enableTool(tool)
    } else {
      sessions[agent].disableTool(tool)
    }

    res.json({
      ok:          true,
      agent,
      tool,
      enabled,
      activeTools: sessions[agent].getActiveToolNames(),
    })
  })

  return router
}
