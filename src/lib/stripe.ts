import Stripe from 'stripe'
import { Logger } from './logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export class PaymentService {
  // Créer un customer Stripe
  static async createCustomer(email: string, name?: string, metadata?: Record<string, string>) {
    try {
      return await stripe.customers.create({
        email,
        name,
        metadata
      })
    } catch (error) {
      Logger.error('Failed to create Stripe customer', error)
      throw error
    }
  }

  // Créer un abonnement
  static async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>) {
    try {
      return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata
      })
    } catch (error) {
      Logger.error('Failed to create subscription', error)
      throw error
    }
  }

  // Créer un paiement unique
  static async createPaymentIntent(amount: number, currency = 'eur', customerId?: string) {
    try {
      return await stripe.paymentIntents.create({
        amount: amount * 100, // Stripe utilise les centimes
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true }
      })
    } catch (error) {
      Logger.error('Failed to create payment intent', error)
      throw error
    }
  }

  // Créer une session Checkout
  static async createCheckoutSession(params: {
    customerId?: string
    priceId?: string
    mode: 'subscription' | 'payment'
    successUrl: string
    cancelUrl: string
    amount?: number
    currency?: string
    metadata?: Record<string, string>
  }) {
    try {
      const sessionData: any = {
        customer: params.customerId,
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata
      }

      if (params.mode === 'subscription') {
        sessionData.line_items = [{ price: params.priceId, quantity: 1 }]
      } else {
        sessionData.line_items = [{
          price_data: {
            currency: params.currency || 'eur',
            product_data: { name: 'Paiement VividFlow' },
            unit_amount: (params.amount || 0) * 100
          },
          quantity: 1
        }]
      }

      return await stripe.checkout.sessions.create(sessionData)
    } catch (error) {
      Logger.error('Failed to create checkout session', error)
      throw error
    }
  }

  // Gérer les webhooks Stripe
  static async handleWebhook(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )

      Logger.info(`Stripe webhook received: ${event.type}`)

      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        
        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        
        case 'invoice.payment_failed':
          return await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        
        default:
          Logger.debug(`Unhandled webhook event: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      Logger.error('Webhook handling failed', error)
      throw error
    }
  }

  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    Logger.info(`Checkout completed for session: ${session.id}`)
    // TODO: Mettre à jour la base de données utilisateur
    return { success: true }
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    Logger.info(`Payment succeeded for invoice: ${invoice.id}`)
    // TODO: Activer l'accès utilisateur
    return { success: true }
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    Logger.warn(`Payment failed for invoice: ${invoice.id}`)
    // TODO: Notifier l'utilisateur
    return { success: true }
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    Logger.info(`Subscription updated: ${subscription.id}`)
    // TODO: Mettre à jour les permissions
    return { success: true }
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    Logger.info(`Subscription deleted: ${subscription.id}`)
    // TODO: Révoquer l'accès
    return { success: true }
  }
}

export default stripe