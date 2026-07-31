/**
 * Provenance concrète d'un lead, sous la rangée Source.
 *
 * « Inbound » et « Outbound » disent la famille, pas le canal. Cette étiquette
 * dit par où la personne est réellement arrivée : le formulaire Facebook pour
 * l'entrant, l'emailing pour le sortant. Les logos sont dessinés en SVG (traces
 * officielles Simple Icons, CC0) : aucun appel réseau, aucune image à charger.
 */

function MetaLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#0081FB"
        d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 13.687c0 1.28.194 2.372.646 3.223.452.851 1.16 1.463 2.174 1.463 1.42 0 2.44-.664 4.26-3.844.973-1.7 1.9-3.61 2.539-4.9.283.582.599 1.24.94 1.965l.928 1.994c.29.62.583 1.209.881 1.755.874 1.6 1.766 2.706 3.056 3.03.44.11.9.11 1.36.11 1.014 0 1.722-.612 2.174-1.463.452-.851.646-1.943.646-3.223 0-1.804-.704-4.479-2.044-6.544C17.372 5.31 15.657 4.03 13.69 4.03c-1.23 0-2.35.57-3.34 1.53a12.1 12.1 0 0 0-.46.48 12.1 12.1 0 0 0-.46-.48c-.99-.96-2.11-1.53-3.34-1.53H6.915Zm-.03 2.2h.03c.62 0 1.24.31 1.88.93.3.29.6.64.89 1.03-.7 1.42-1.62 3.32-2.53 4.9-1.51 2.64-2.05 2.77-2.41 2.77-.3 0-.5-.14-.66-.44-.16-.3-.28-.85-.28-1.73 0-1.41.58-3.63 1.63-5.25.86-1.33 1.75-1.99 2.45-2.21Zm10.2 0c.7.22 1.59.88 2.45 2.21 1.05 1.62 1.63 3.84 1.63 5.25 0 .88-.12 1.43-.28 1.73-.16.3-.36.44-.66.44-.36 0-.9-.13-2.41-2.77-.3-.53-.6-1.14-.92-1.82l-.9-1.94c-.35-.75-.68-1.44-.98-2.06.29-.39.59-.74.89-1.03.64-.62 1.26-.93 1.88-.93h.3Z"
      />
    </svg>
  )
}

function GmailLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M1.636 5.455 12 13.09l10.364-7.636A1.64 1.64 0 0 0 20.727 4.5H3.273a1.64 1.64 0 0 0-1.637.955Z" />
      <path fill="#FBBC04" d="M1.5 6.3v11.564c0 .904.732 1.636 1.636 1.636h1.773V8.59L1.5 6.3Z" />
      <path fill="#34A853" d="M19.091 8.59v10.91h1.773c.904 0 1.636-.732 1.636-1.636V6.3l-3.409 2.29Z" />
      <path fill="#4285F4" d="M4.909 19.5V8.59L12 13.91l7.091-5.32V19.5H4.909Z" />
    </svg>
  )
}

const ORIGINS: Record<string, { label: string; Logo: (p: { size?: number }) => React.ReactElement }> = {
  inbound: { label: 'Formulaire Facebook', Logo: MetaLogo },
  outbound: { label: 'Emailing', Logo: GmailLogo },
}

export default function OriginBadge({ source }: { source: string | null | undefined }) {
  const o = source ? ORIGINS[source] : undefined
  if (!o) return null
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <o.Logo size={13} />
      <span className="text-[11px] font-medium text-soren-muted">{o.label}</span>
    </div>
  )
}
