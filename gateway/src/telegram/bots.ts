import TelegramBot from 'node-telegram-bot-api'
import { config } from '../config'

// In production: polling: false (webhooks registered in index.ts)
// In dev: set TELEGRAM_USE_POLLING=true for local testing
const usePolling = process.env.TELEGRAM_USE_POLLING === 'true'

export const sorenBot = new TelegramBot(config.telegram.sorenToken, { polling: usePolling })
export const kaiBot   = new TelegramBot(config.telegram.kaiToken,   { polling: usePolling })
export const miaBot   = new TelegramBot(config.telegram.miaToken,   { polling: usePolling })

export const bots = { soren: sorenBot, kai: kaiBot, mia: miaBot }
