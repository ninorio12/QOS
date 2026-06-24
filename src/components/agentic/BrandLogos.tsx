/** Logos officiels des plateformes (couleurs de marque) — pour les canaux des agents. */

type Props = { size?: number; className?: string }

// Slack — marque officielle (octothorpe 4 couleurs)
export function SlackLogo({ size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 122.8 122.8" className={className} role="img" aria-label="Slack">
      <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z" fill="#E01E5A" />
      <path d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A" />
      <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z" fill="#36C5F0" />
      <path d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0" />
      <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z" fill="#2EB67D" />
      <path d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D" />
      <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z" fill="#ECB22E" />
      <path d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E" />
    </svg>
  )
}

// Telegram — marque officielle (avion blanc sur cercle bleu)
export function TelegramLogo({ size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="Telegram">
      <circle cx="24" cy="24" r="24" fill="#229ED9" />
      <path fill="#fff" d="M10.9 23.4c7-3 11.6-5 14-6 6.6-2.8 8-3.2 8.9-3.2.2 0 .6 0 .9.3.2.2.3.5.3.7 0 .2 0 .6-.1.9-.7 7.1-3.6 17.6-3.6 17.6-.6 2.8-1.8 3.7-2.9 3.8-2.4.2-4.2-1.6-6.5-3.1-3.6-2.4-5.7-3.9-9.2-6.2-4.1-2.7-1.4-4.2.9-6.6.6-.6 11-10 11.2-10.9 0-.1 0-.5-.2-.7-.2-.2-.5-.1-.7-.1-.3.1-5.2 3.3-14.7 9.7-1.4.9-2.6 1.4-3.8 1.4-1.2 0-3.6-.7-5.4-1.3-2.2-.7-3.9-1.1-3.8-2.3.1-.6 1-1.2 2.6-1.9z" />
    </svg>
  )
}

export const CHANNEL_LOGO: Record<string, React.FC<Props>> = { slack: SlackLogo, telegram: TelegramLogo }
