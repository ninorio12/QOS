import cron from 'node-cron'
import type { SessionManager } from '../sessions/SessionManager'
import type { AgentName } from '../config'
import { triggerDailyDigest } from './dailyDigest'
import { runPipelinePoller }  from './pipelinePoller'
import { runWeeklyAnalysis }  from './weeklyAnalysis'

export function initScheduler(sessions: Record<AgentName, SessionManager>): void {
  // 07h00 every day — daily digest
  cron.schedule('0 7 * * *', async () => {
    console.log('[cron] Daily digest triggered')
    await triggerDailyDigest(sessions.soren).catch(err =>
      console.error('[cron] Daily digest error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  // Every 10 minutes — pipeline poller
  cron.schedule('*/10 * * * *', async () => {
    console.log('[cron] Pipeline poll triggered')
    await runPipelinePoller(sessions.soren).catch(err =>
      console.error('[cron] Pipeline poll error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  // Sunday 09h00 — weekly self-improvement
  cron.schedule('0 9 * * 0', async () => {
    console.log('[cron] Weekly analysis triggered')
    await runWeeklyAnalysis(sessions.soren).catch(err =>
      console.error('[cron] Weekly analysis error:', err)
    )
  }, { timezone: 'Europe/Paris' })

  console.log('[gateway] Cron scheduler initialized (3 jobs: digest, poller, weekly)')
}
