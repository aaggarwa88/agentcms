import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

const memoryStore = new Map<string, number[]>()

function cleanupMemory(key: string, now: number) {
  const timestamps = memoryStore.get(key) ?? []
  const recent = timestamps.filter(t => now - t < WINDOW_MS)
  if (recent.length === 0) {
    memoryStore.delete(key)
  } else {
    memoryStore.set(key, recent)
  }
}

function checkMemoryLimit(key: string): boolean {
  const now = Date.now()
  cleanupMemory(key, now)
  const timestamps = memoryStore.get(key) ?? []
  if (timestamps.length >= MAX_REQUESTS) {
    return false
  }
  timestamps.push(now)
  memoryStore.set(key, timestamps)
  return true
}

let upstashLimiter: Ratelimit | null = null

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter) return upstashLimiter
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '60 s'),
    prefix: 'agentcms:submit',
  })
  return upstashLimiter
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') ?? 'unknown'
}

export async function checkSubmitRateLimit(
  projectSlug: string,
  datasetSlug: string,
  ip: string
): Promise<boolean> {
  const key = `submit:${projectSlug}:${datasetSlug}:${ip}`
  const limiter = getUpstashLimiter()

  if (limiter) {
    const { success } = await limiter.limit(key)
    return success
  }

  return checkMemoryLimit(key)
}
