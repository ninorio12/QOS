import { Resend } from 'resend'
import { Logger } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

interface EmailOptions {
  to: string | string[]
  from?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export class EmailService {
  private static readonly FROM_EMAIL = 'noreply@vividflow.fr'
  private static readonly TEMPLATES = {
    welcome: {
      subject: '🎉 Bienvenue sur VividFlow !',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #2563eb;">Bienvenue sur VividFlow !</h1>
          <p>Votre compte a été créé avec succès. Vous pouvez maintenant commencer à utiliser notre plateforme.</p>
          <a href="{{loginUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Se connecter
          </a>
        </div>
      `
    },
    
    resetPassword: {
      subject: '🔐 Réinitialisation de votre mot de passe',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #dc2626;">Réinitialisation de mot de passe</h1>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
          <a href="{{resetUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Réinitialiser le mot de passe
          </a>
          <p><small>Ce lien expire dans 1 heure.</small></p>
        </div>
      `
    },
    
    invoice: {
      subject: '📄 Nouvelle facture - VividFlow',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #059669;">Nouvelle facture</h1>
          <p>Votre facture du {{date}} d'un montant de {{amount}} est disponible.</p>
          <a href="{{invoiceUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Voir la facture
          </a>
        </div>
      `
    },
    
    notification: {
      subject: '🔔 {{title}}',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1 style="color: #7c3aed;">{{title}}</h1>
          <div>{{content}}</div>
          {{#actionUrl}}
          <a href="{{actionUrl}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            {{actionText}}
          </a>
          {{/actionUrl}}
        </div>
      `
    }
  }

  // Envoyer un email générique
  static async sendEmail(template: EmailTemplate, options: EmailOptions) {
    try {
      const result = await resend.emails.send({
        from: options.from || this.FROM_EMAIL,
        to: options.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        cc: options.cc,
        bcc: options.bcc,
        reply_to: options.replyTo,
        attachments: options.attachments
      })

      Logger.info(`Email sent successfully`, { 
        to: options.to, 
        subject: template.subject,
        messageId: result.data?.id 
      })

      return result
    } catch (error) {
      Logger.error('Failed to send email', error)
      throw error
    }
  }

  // Templates prédéfinis
  static async sendWelcomeEmail(to: string, variables: { loginUrl: string }) {
    const template = {
      ...this.TEMPLATES.welcome,
      html: this.replaceVariables(this.TEMPLATES.welcome.html, variables)
    }
    
    return this.sendEmail(template, { to })
  }

  static async sendPasswordReset(to: string, variables: { resetUrl: string }) {
    const template = {
      ...this.TEMPLATES.resetPassword,
      html: this.replaceVariables(this.TEMPLATES.resetPassword.html, variables)
    }
    
    return this.sendEmail(template, { to })
  }

  static async sendInvoice(to: string, variables: { date: string, amount: string, invoiceUrl: string }) {
    const template = {
      ...this.TEMPLATES.invoice,
      html: this.replaceVariables(this.TEMPLATES.invoice.html, variables)
    }
    
    return this.sendEmail(template, { to })
  }

  static async sendNotification(
    to: string, 
    variables: { title: string, content: string, actionUrl?: string, actionText?: string }
  ) {
    const template = {
      subject: this.replaceVariables(this.TEMPLATES.notification.subject, variables),
      html: this.replaceVariables(this.TEMPLATES.notification.html, variables)
    }
    
    return this.sendEmail(template, { to })
  }

  // Envoyer en batch
  static async sendBatch(emails: Array<{
    template: EmailTemplate
    options: EmailOptions
  }>) {
    try {
      const promises = emails.map(({ template, options }) => 
        this.sendEmail(template, options)
      )
      
      const results = await Promise.allSettled(promises)
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      Logger.info(`Batch email completed`, { successful, failed, total: emails.length })
      
      return { successful, failed, results }
    } catch (error) {
      Logger.error('Batch email failed', error)
      throw error
    }
  }

  // Utilitaire pour remplacer les variables
  private static replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match
    })
  }
}

export default resend