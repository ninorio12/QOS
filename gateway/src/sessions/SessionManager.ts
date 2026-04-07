import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool, ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages'
import { config, type AgentName } from '../config'
import { eventBus } from '../EventBus'

type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>

interface ToolEntry {
  definition: Tool
  executor:   ToolExecutor
}

export class SessionManager {
  private client:  Anthropic
  private history: MessageParam[] = []
  private tools    = new Map<string, ToolEntry>()
  private agentCfg: { model: string; soul: string; skills: readonly string[] }

  constructor(private name: AgentName) {
    this.client   = new Anthropic({ apiKey: config.anthropicKey })
    this.agentCfg = config.agents[name]
  }

  registerTool(name: string, definition: Omit<Tool, 'name'>, executor: ToolExecutor): void {
    this.tools.set(name, { definition: { name, ...definition }, executor })
  }

  async send(userMessage: string): Promise<string> {
    this.history.push({ role: 'user', content: userMessage })

    let response = await this.client.messages.create({
      model:      this.agentCfg.model,
      max_tokens: 4096,
      system:     this.agentCfg.soul,
      messages:   this.history,
      tools:      Array.from(this.tools.values()).map(t => t.definition),
    })

    // Agentic loop: keep handling tool_use until end_turn
    while (response.stop_reason === 'tool_use') {
      this.history.push({ role: 'assistant', content: response.content })

      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use'
      )

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const entry = this.tools.get(block.name)
          let result: unknown
          if (entry) {
            result = await entry.executor(block.input as Record<string, unknown>)
          } else {
            result = { error: `Unknown tool: ${block.name}` }
          }

          eventBus.emit({
            type:      block.name,
            from:      this.name,
            to:        String((block.input as Record<string, unknown>).to ?? 'unknown'),
            msg:       String((block.input as Record<string, unknown>).message ?? block.name),
            timestamp: new Date().toISOString(),
          })

          return {
            type:        'tool_result' as const,
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          }
        })
      )

      this.history.push({ role: 'user', content: toolResults })

      response = await this.client.messages.create({
        model:      this.agentCfg.model,
        max_tokens: 4096,
        system:     this.agentCfg.soul,
        messages:   this.history,
        tools:      Array.from(this.tools.values()).map(t => t.definition),
      })
    }

    // Extract final text
    const text = response.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    this.history.push({ role: 'assistant', content: response.content })
    return text
  }

  // Trim history to last N exchanges to avoid context overflow
  trimHistory(maxExchanges = 20): void {
    if (this.history.length > maxExchanges * 2) {
      this.history = this.history.slice(-maxExchanges * 2)
    }
  }
}
