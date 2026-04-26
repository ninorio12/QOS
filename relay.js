#!/usr/bin/env node
// relay.js — Bridge Hermes ↔ Claude Code (QOS)
// Lance : node relay.js
// Hermes envoie un message Telegram → Claude répond → Hermes reçoit la réponse

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Config
const ENV_FILE   = path.join(__dirname, '.env.local')
const QOS_DIR    = __dirname
const POLL_MS    = 3000          // vérif Telegram toutes les 3s
const HERMES_ID  = 7354829275   // chat_id Hermes/Thomas

// Charger les vars d'env
const env = {}
fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
  const eq = line.indexOf('=')
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
})

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) { console.error('TELEGRAM_BOT_TOKEN manquant dans .env.local'); process.exit(1) }

let lastUpdateId = 0
let busy = false

console.log('🤝 Relay Hermes ↔ QOS démarré')
console.log('   Hermes envoie un message Telegram → Claude répond automatiquement')
console.log('   Ctrl+C pour arrêter\n')

async function tgGet(method, params = {}) {
  const qs  = new URLSearchParams(params).toString()
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}?${qs}`)
  return res.json()
}

async function tgSend(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

async function askClaude(message) {
  // Appel Claude CLI en mode non-interactif depuis le répertoire QOS
  const escaped = message.replace(/"/g, '\\"').replace(/`/g, '\\`')
  const cmd = `claude --print "${escaped}" --output-format text --dangerously-skip-permissions`
  try {
    const out = execSync(cmd, {
      cwd: QOS_DIR,
      timeout: 120_000,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        ...(env.CLAUDE_SESSION_TOKEN ? { CLAUDE_SESSION_TOKEN: env.CLAUDE_SESSION_TOKEN } : {}),
      },
    })
    return out.trim()
  } catch (e) {
    return `❌ Erreur Claude : ${e.message?.slice(0, 200) ?? 'inconnue'}`
  }
}

async function poll() {
  if (busy) return

  const data = await tgGet('getUpdates', {
    offset: lastUpdateId + 1,
    timeout: 2,
    allowed_updates: 'message',
  }).catch(() => null)

  if (!data?.ok || !data.result?.length) return

  for (const update of data.result) {
    lastUpdateId = update.update_id

    const msg  = update.message
    const text = msg?.text?.trim()
    if (!text || msg.from?.is_bot) continue

    // N'écouter que Hermes (chat_id connu)
    if (msg.chat.id !== HERMES_ID) continue

    // Ignorer les commandes système
    if (text.startsWith('/')) continue

    busy = true
    console.log(`\n← Hermes : ${text}`)
    await tgSend(HERMES_ID, `⏳ _En train de répondre…_`)

    const response = await askClaude(text)

    // Tronquer si trop long pour Telegram (4096 chars max)
    const reply = response.length > 3800
      ? response.slice(0, 3800) + '\n\n_[tronqué — réponse complète dans Claude Code]_'
      : response

    await tgSend(HERMES_ID, reply)
    console.log(`→ QOS    : ${reply.slice(0, 120)}…`)
    busy = false
  }
}

// Boucle de polling
setInterval(poll, POLL_MS)
poll()
