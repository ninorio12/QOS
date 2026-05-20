import webpush from 'web-push'
import { Logger } from './logger'

// Configuration VAPID
webpush.setVapidDetails(
  'mailto:contact@vividflow.fr',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class NotificationService {
  // Envoyer une notification à un utilisateur
  static async sendToUser(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const pushPayload = JSON.stringify(payload)
      
      await webpush.sendNotification(subscription, pushPayload)
      
      Logger.info('Push notification sent', { 
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        title: payload.title 
      })
    } catch (error) {
      Logger.error('Failed to send push notification', error)
      throw error
    }
  }

  // Envoyer à plusieurs utilisateurs
  static async sendToMultiple(
    subscriptions: PushSubscription[],
    payload: NotificationPayload
  ): Promise<{ successful: number, failed: number }> {
    const promises = subscriptions.map(sub => 
      this.sendToUser(sub, payload).catch(error => ({ error, sub }))
    )
    
    const results = await Promise.allSettled(promises)
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && !('error' in r.value)
    ).length
    
    const failed = results.length - successful
    
    Logger.info('Bulk push notifications completed', { successful, failed, total: subscriptions.length })
    
    return { successful, failed }
  }

  // Templates de notifications
  static async sendWelcomeNotification(subscription: PushSubscription, userName: string) {
    return this.sendToUser(subscription, {
      title: '🎉 Bienvenue sur VividFlow !',
      body: `Salut ${userName}, ton compte a été créé avec succès.`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { type: 'welcome', userId: userName },
      actions: [
        { action: 'open', title: 'Ouvrir l\'app', icon: '/action-open.png' },
        { action: 'dismiss', title: 'Fermer' }
      ]
    })
  }

  static async sendTaskReminder(subscription: PushSubscription, taskTitle: string, dueDate: string) {
    return this.sendToUser(subscription, {
      title: '⏰ Rappel de tâche',
      body: `N'oublie pas: "${taskTitle}" est due le ${dueDate}`,
      icon: '/icon-192x192.png',
      tag: 'task-reminder',
      requireInteraction: true,
      data: { type: 'task_reminder', task: taskTitle },
      actions: [
        { action: 'complete', title: 'Marquer terminé' },
        { action: 'snooze', title: 'Rappel +1h' }
      ]
    })
  }

  static async sendNewMessage(subscription: PushSubscription, senderName: string, preview: string) {
    return this.sendToUser(subscription, {
      title: `💬 Message de ${senderName}`,
      body: preview,
      icon: '/icon-192x192.png',
      tag: 'new-message',
      data: { type: 'new_message', sender: senderName },
      actions: [
        { action: 'reply', title: 'Répondre' },
        { action: 'view', title: 'Voir' }
      ]
    })
  }

  static async sendSystemAlert(subscription: PushSubscription, message: string, level: 'info' | 'warning' | 'error' = 'info') {
    const icons = {
      info: '💙',
      warning: '⚠️',
      error: '🚨'
    }

    return this.sendToUser(subscription, {
      title: `${icons[level]} Alerte système`,
      body: message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `system-${level}`,
      requireInteraction: level === 'error',
      data: { type: 'system_alert', level }
    })
  }

  // Générer les clés VAPID (à exécuter une seule fois)
  static generateVapidKeys(): { publicKey: string, privateKey: string } {
    return webpush.generateVAPIDKeys()
  }

  // Vérifier si une subscription est valide
  static async validateSubscription(subscription: PushSubscription): Promise<boolean> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'Test',
        body: 'Validation test',
        silent: true
      }))
      return true
    } catch (error) {
      Logger.debug('Subscription validation failed', { endpoint: subscription.endpoint })
      return false
    }
  }

  // Nettoyer les subscriptions invalides
  static async cleanInvalidSubscriptions(subscriptions: PushSubscription[]): Promise<PushSubscription[]> {
    const validationPromises = subscriptions.map(async sub => ({
      subscription: sub,
      isValid: await this.validateSubscription(sub)
    }))

    const results = await Promise.all(validationPromises)
    const validSubscriptions = results
      .filter(result => result.isValid)
      .map(result => result.subscription)

    const removedCount = subscriptions.length - validSubscriptions.length
    if (removedCount > 0) {
      Logger.info(`Cleaned ${removedCount} invalid push subscriptions`)
    }

    return validSubscriptions
  }
}