import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Schema pour analytics
export const trackEvent = mutation({
  args: {
    event: v.string(), // 'page_view', 'click', 'conversion', etc.
    userId: v.optional(v.string()),
    sessionId: v.string(),
    properties: v.optional(v.any()), // données custom
    timestamp: v.optional(v.number()),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("analytics_events", {
      ...args,
      timestamp: args.timestamp || Date.now()
    })
    
    // Mettre à jour les métriques en temps réel
    await updateRealTimeMetrics(ctx, args.event, args.userId)
    
    return eventId
  }
})

// Métriques en temps réel
async function updateRealTimeMetrics(ctx: any, event: string, userId?: string) {
  const today = new Date().toISOString().split('T')[0]
  
  // Incrémenter compteur journalier
  const existing = await ctx.db
    .query("analytics_daily")
    .withIndex("by_date_event", (q: any) => 
      q.eq("date", today).eq("event", event)
    )
    .first()
    
  if (existing) {
    await ctx.db.patch(existing._id, { 
      count: existing.count + 1,
      lastUpdated: Date.now()
    })
  } else {
    await ctx.db.insert("analytics_daily", {
      date: today,
      event,
      count: 1,
      lastUpdated: Date.now()
    })
  }
}

// Dashboard analytics en temps réel
export const getRealTimeAnalytics = query({
  args: { 
    days: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const days = args.days || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Métriques des X derniers jours
    const metrics = await ctx.db
      .query("analytics_daily")
      .filter((q) => q.gte(q.field("date"), startDate.toISOString().split('T')[0]))
      .collect()
    
    // Agrégation par événement
    const eventTotals = metrics.reduce((acc, metric) => {
      acc[metric.event] = (acc[metric.event] || 0) + metric.count
      return acc
    }, {} as Record<string, number>)
    
    // Sessions actives (dernières 30 minutes)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
    const activeSessions = await ctx.db
      .query("analytics_events")
      .filter((q) => q.gte(q.field("timestamp"), thirtyMinutesAgo))
      .collect()
    
    const uniqueSessions = new Set(activeSessions.map(e => e.sessionId))
    
    return {
      eventTotals,
      activeSessions: uniqueSessions.size,
      totalEvents: Object.values(eventTotals).reduce((a, b) => a + b, 0),
      topPages: getTopPages(activeSessions),
      timeSeriesData: getTimeSeriesData(metrics, days)
    }
  }
})

function getTopPages(events: any[]) {
  const pageCounts = events.reduce((acc, event) => {
    if (event.page) {
      acc[event.page] = (acc[event.page] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(pageCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }))
}

function getTimeSeriesData(metrics: any[], days: number) {
  const series: Record<string, number[]> = {}
  const dates: string[] = []
  
  // Générer les dates
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  
  // Organiser par événement et date
  dates.forEach(date => {
    const dayMetrics = metrics.filter(m => m.date === date)
    dayMetrics.forEach(metric => {
      if (!series[metric.event]) {
        series[metric.event] = new Array(days).fill(0)
      }
      const dayIndex = dates.indexOf(date)
      series[metric.event][dayIndex] = metric.count
    })
  })
  
  return {
    dates,
    series: Object.entries(series).map(([event, data]) => ({
      name: event,
      data
    }))
  }
}