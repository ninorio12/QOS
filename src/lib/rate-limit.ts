type Bucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, Bucket>()

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: 0,
  }
}
