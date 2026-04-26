import { getWorkflows } from '@/lib/ghl'
import { getKaiAgentSettings } from '@/lib/kai-agent-settings'
import WorkflowsView from '@/components/workflows/WorkflowsView'

export const dynamic = 'force-dynamic'

export default async function WorkflowsPage() {
  let workflows: Awaited<ReturnType<typeof getWorkflows>> = []
  try { workflows = await getWorkflows() } catch {}

  const kai = await getKaiAgentSettings()

  return (
    <WorkflowsView
      workflows={workflows}
      escalade={{
        initialSystemPrompt: kai.systemPrompt,
        initialAutoResponse: kai.autoResponse,
        initialBudgetMin:    kai.budgetMin,
        initialActiveHours:  kai.activeHours,
      }}
    />
  )
}
