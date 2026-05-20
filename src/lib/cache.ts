import NodeCache from 'node-cache'
import { Logger } from './logger'

// Cache en mémoire local (fallback)
const memoryCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes par défaut
  checkperiod: 60 // vérification toutes les minutes
})

interface CacheConfig {
  ttl?: number // Time to live en secondes
  namespace?: string
}

export class Cache {
  private static getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  // GET from cache
  static async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const fullKey = this.getKey(key, config?.namespace)
    
    try {
      // Try Redis first (if configured)
      // const redisValue = await redis?.get(fullKey)
      // if (redisValue) return JSON.parse(redisValue)
      
      // Fallback to memory cache
      const value = memoryCache.get<T>(fullKey)
      if (value !== undefined) {
        Logger.debug(`Cache hit: ${fullKey}`)
        return value
      }
      
      Logger.debug(`Cache miss: ${fullKey}`)
      return null
    } catch (error) {
      Logger.error(`Cache get error: ${fullKey}`, error)
      return null
    }
  }

  // SET in cache
  static async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    const fullKey = this.getKey(key, config?.namespace)
    const ttl = config?.ttl || 600
    
    try {
      // Set in Redis (if configured)
      // await redis?.setex(fullKey, ttl, JSON.stringify(value))
      
      // Set in memory cache
      memoryCache.set(fullKey, value, ttl)
      Logger.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`)
    } catch (error) {
      Logger.error(`Cache set error: ${fullKey}`, error)
    }
  }

  // DELETE from cache
  static async del(key: string, config?: CacheConfig): Promise<void> {
    const fullKey = this.getKey(key, config?.namespace)
    
    try {
      // Delete from Redis
      // await redis?.del(fullKey)
      
      // Delete from memory cache
      memoryCache.del(fullKey)
      Logger.debug(`Cache deleted: ${fullKey}`)
    } catch (error) {
      Logger.error(`Cache delete error: ${fullKey}`, error)
    }
  }

  // CLEAR namespace or all
  static async clear(namespace?: string): Promise<void> {
    try {
      if (namespace) {
        const keys = memoryCache.keys().filter(key => key.startsWith(`${namespace}:`))
        memoryCache.del(keys)
        Logger.debug(`Cache cleared namespace: ${namespace}`)
      } else {
        memoryCache.flushAll()
        Logger.debug('Cache cleared all')
      }
    } catch (error) {
      Logger.error('Cache clear error', error)
    }
  }

  // GET cache stats
  static getStats() {
    return {
      keys: memoryCache.getStats().keys,
      hits: memoryCache.getStats().hits,
      misses: memoryCache.getStats().misses,
      ksize: memoryCache.getStats().ksize,
      vsize: memoryCache.getStats().vsize
    }
  }
}