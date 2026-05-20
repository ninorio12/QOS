import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiter pour API calls
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
})

// Rate limiter pour auth
const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 auth attempts per minute
  analytics: true,
})

export async function checkRateLimit(identifier: string, type: 'api' | 'auth' = 'api') {
  const limiter = type === 'auth' ? authRateLimit : ratelimit
  const { success, limit, reset, remaining } = await limiter.limit(identifier)
  
  return {
    success,
    limit,
    reset,
    remaining,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }
  }
}

export { ratelimit, authRateLimit }