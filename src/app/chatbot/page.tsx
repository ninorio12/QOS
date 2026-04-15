import { getKaiAgentSettings } from '@/lib/kai-agent-settings'
import ChatbotView from '@/components/chatbot/ChatbotView'

export const revalidate = 300

export default async function ChatbotPage() {
  const kai = await getKaiAgentSettings()

  return (
    <ChatbotView
      initialSystemPrompt={kai.systemPrompt}
      initialAutoResponse={kai.autoResponse}
      initialBudgetMin={kai.budgetMin}
      initialActiveHours={kai.activeHours}
    />
  )
}
