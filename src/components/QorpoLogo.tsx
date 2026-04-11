export function QorpoIcon({ size = 36, bg = '#1C2333' }: { size?: number; bg?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagon (pointy-top) */}
      <path
        d="M20 0L40 11.547V34.641L20 46.188L0 34.641V11.547L20 0Z"
        fill="#E2FF8D"
      />
      {/* Q bowl — inner circle cutout */}
      <circle cx="20" cy="22" r="8.5" fill={bg} />
      {/* Q ring — visible ring via partial re-fill */}
      <circle cx="20" cy="22" r="8.5" fill="none" stroke="#E2FF8D" strokeWidth="4.5" />
      {/* Q tail — notch extending bottom-right */}
      <rect x="25" y="27" width="10" height="4.5" rx="2" fill="#E2FF8D" />
      {/* Tail inner cutout to detach from ring */}
      <rect x="25" y="28" width="5" height="2.5" fill={bg} />
    </svg>
  )
}

export function QorpoLogo({ size = 36, bg = '#1C2333' }: { size?: number; bg?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <QorpoIcon size={size} bg={bg} />
      <span
        className="font-extrabold tracking-[0.12em] text-white"
        style={{ fontSize: size * 0.44, letterSpacing: '0.1em' }}
      >
        QORPO
      </span>
    </div>
  )
}
