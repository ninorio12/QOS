'use client'

import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function parseNumeric(str: string): { prefix: string; suffix: string; num: number } | null {
  const match = str.match(/^([^0-9]*)([0-9][0-9\s]*)([^0-9]*)$/)
  if (!match) return null
  const num = parseFloat(match[2].replace(/\s/g, ''))
  if (isNaN(num)) return null
  return { prefix: match[1], suffix: match[3], num }
}

function formatLike(template: string, num: number): string {
  const parsed = parseNumeric(template)
  if (!parsed) return template
  const rounded = Math.round(num)
  const formatted = rounded.toLocaleString('fr-FR')
  // Préserver l'espace entre le nombre et un suffixe texte (ex. « 0 CHF »), pas pour « 32% ».
  const sep = parsed.suffix && /[0-9]\s+\D/.test(template) ? ' ' : ''
  return parsed.prefix + formatted + sep + parsed.suffix
}

interface Props {
  value:      string
  className?: string
  duration?:  number
}

export default function RollingNumber({ value, className, duration = 900 }: Props) {
  const parsed   = parseNumeric(value)
  const target   = parsed?.num ?? null
  const [display, setDisplay] = useState(target !== null ? formatLike(value, 0) : value)
  const rafRef   = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef  = useRef(0)

  useEffect(() => {
    if (target === null) { setDisplay(value); return }

    const from = fromRef.current
    startRef.current = null

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      const current = from + (target - from) * eased
      setDisplay(formatLike(value, current))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = target
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, target, duration])

  return <span className={className}>{display}</span>
}
