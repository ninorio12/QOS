'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#EF4444' }}>{error.message || 'Une erreur est survenue'}</p>
        <button
          onClick={reset}
          style={{ padding: '8px 20px', background: '#111111', color: 'white', border: 'none', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
