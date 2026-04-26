// Structured logger — trace_id, contact_id, stage, action, status, timestamp
import crypto from 'crypto'

export type LogEntry = {
  trace_id: string
  contact_id?: string
  stage?: string
  action: string
  status: 'ok' | 'error' | 'warn'
  detail?: string
  timestamp: string
}

function newTraceId() {
  return crypto.randomBytes(6).toString('hex')
}

function emit(entry: LogEntry) {
  // Console structuré JSON (capturé par tout log aggregator)
  console.log(JSON.stringify(entry))

  // Alerte Telegram si erreur
  if (entry.status === 'error') {
    alertTelegram(entry).catch(() => {})
  }
}

async function alertTelegram(entry: LogEntry) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const text = [
    `🚨 *QOS ALERTE* \`${entry.action}\``,
    `Status: ${entry.status}`,
    entry.contact_id ? `Contact: \`${entry.contact_id}\`` : null,
    entry.stage      ? `Stage: ${entry.stage}` : null,
    entry.detail     ? `\`${entry.detail.slice(0, 200)}\`` : null,
    `\`${entry.timestamp}\``,
  ].filter(Boolean).join('\n')

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

export const log = {
  ok: (action: string, opts: Partial<LogEntry> = {}) =>
    emit({ trace_id: newTraceId(), ...opts, action, status: 'ok', timestamp: new Date().toISOString() }),

  error: (action: string, detail: string, opts: Partial<LogEntry> = {}) =>
    emit({ trace_id: newTraceId(), ...opts, action, status: 'error', detail, timestamp: new Date().toISOString() }),

  warn: (action: string, detail: string, opts: Partial<LogEntry> = {}) =>
    emit({ trace_id: newTraceId(), ...opts, action, status: 'warn', detail, timestamp: new Date().toISOString() }),
}
