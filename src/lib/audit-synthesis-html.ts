// Construit le HTML du livrable "Profit Map" (synthèse d'audit) pixel-perfect.
// Le template canonique vient de /root/vividflow-profit-map/index.html (encodé en base64),
// on y injecte l'objet DATA (extrait du Google Sheet, ou Bold Shift par défaut),
// le logo VividFlow et la vraie signature de Jonathan (data-URI).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AUDIT_TEMPLATE_B64 } from './audit-synthesis/template-b64'
import { PROFIT_MAP_LOGO_DATA_URI } from './audit-synthesis/logo-b64'
import { JONATHAN_SIGNATURE_DATA_URI } from './contract-signature'
import { BOLD_SHIFT_DATA } from './audit-synthesis/default-data'

export type AuditSynthesisMeta = {
  clientName?: string | null
  sheetUrl?: string | null
  mappingUrl?: string | null
  recordId?: string | null
}

export function buildAuditSynthesisHtml(opts: { data?: any } = {}): string {
  const data = opts.data ?? BOLD_SHIFT_DATA
  const json = JSON.stringify(data).replace(/</g, '\\u003c') // évite de casser </script>
  let html = Buffer.from(AUDIT_TEMPLATE_B64, 'base64').toString('utf8')
  html = html.split('%%DATA%%').join(json)
  html = html.split('%%LOGO_URI%%').join(PROFIT_MAP_LOGO_DATA_URI)
  html = html.split('%%SIGN_URI%%').join(JONATHAN_SIGNATURE_DATA_URI)
  return html
}

export function auditSynthesisFileName(clientName?: string | null): string {
  return `Audit Synthèse VividFlow · ${clientName || 'Bold Shift Collective'}.pdf`
}
