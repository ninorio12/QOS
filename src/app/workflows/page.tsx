import { getWorkflows } from '@/lib/ghl'
import WorkflowsView from '@/components/workflows/WorkflowsView'

export const dynamic = 'force-dynamic'

export default async function WorkflowsPage() {
  let workflows: Awaited<ReturnType<typeof getWorkflows>> = []
  try { workflows = await getWorkflows() } catch {}
  return <WorkflowsView workflows={workflows} />
}
