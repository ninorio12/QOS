import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
    revision: process.env.VERCEL_GIT_COMMIT_SHA,
  },
})

export class Logger {
  static info(message: string, meta?: any) {
    logger.info(meta, message)
  }

  static error(message: string, error?: Error | any) {
    logger.error({ error: error?.stack || error }, message)
  }

  static debug(message: string, meta?: any) {
    logger.debug(meta, message)
  }

  static warn(message: string, meta?: any) {
    logger.warn(meta, message)
  }
}

export const log = {
  ok:    (event: string, meta?: any) => logger.info(meta ?? {}, event),
  warn:  (event: string, message?: string, meta?: any) => logger.warn({ ...meta, message }, event),
  error: (event: string, message?: string, meta?: any) => logger.error({ ...meta, message }, event),
}

export default logger