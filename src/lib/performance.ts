import { Logger } from './logger'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = []
  private static timers = new Map<string, number>()

  // Start measuring
  static start(name: string): void {
    this.timers.set(name, performance.now())
  }

  // End measuring and record
  static end(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      Logger.warn(`Performance timer '${name}' was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    
    // Log slow operations
    if (duration > 1000) { // > 1 second
      Logger.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata)
    }

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    return duration
  }

  // Measure async function
  static async measure<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name)
    try {
      const result = await fn()
      this.end(name, metadata)
      return result
    } catch (error) {
      this.end(name, { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  // Measure sync function
  static measureSync<T>(
    name: string, 
    fn: () => T, 
    metadata?: Record<string, any>
  ): T {
    this.start(name)
    try {
      const result = fn()
      this.end(name, metadata)
      return result
    } catch (error) {
      this.end(name, { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  // Get performance stats
  static getStats() {
    const now = Date.now()
    const lastHour = this.metrics.filter(m => now - m.timestamp < 3600000)
    
    if (lastHour.length === 0) return null

    const durations = lastHour.map(m => m.duration)
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    const min = Math.min(...durations)
    const max = Math.max(...durations)
    
    // P95
    const sorted = [...durations].sort((a, b) => a - b)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95 = sorted[p95Index] || 0

    return {
      total: lastHour.length,
      avg: Number(avg.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      byOperation: this.getOperationStats(lastHour)
    }
  }

  private static getOperationStats(metrics: PerformanceMetric[]) {
    const byOp = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.duration)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(byOp).map(([name, durations]) => ({
      name,
      count: durations.length,
      avg: Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)),
      max: Number(Math.max(...durations).toFixed(2))
    }))
  }

  // Clear metrics
  static clear(): void {
    this.metrics = []
    this.timers.clear()
  }
}

// Decorator for performance monitoring
export function measure(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyName}`

    descriptor.value = function (...args: any[]) {
      if (method.constructor.name === 'AsyncFunction') {
        return PerformanceMonitor.measure(metricName, () => method.apply(this, args))
      } else {
        return PerformanceMonitor.measureSync(metricName, () => method.apply(this, args))
      }
    }
  }
}