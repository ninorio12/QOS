'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const OPTIONS = [
  { value: 'light',  label: 'Light',   icon: Sun },
  { value: 'dark',   label: 'Sombre',  icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
] as const

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { clerkUser } = useCurrentUser()
  const updateProfile = useMutation(api.users.updateProfile)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  function pick(value: string) {
    setTheme(value)
    if (clerkUser) updateProfile({ clerkUserId: clerkUser.id, theme: value })
  }

  return (
    <div className="flex items-center gap-1 bg-soren-elevated rounded-xl p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => pick(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              active
                ? 'bg-soren-card text-soren-text shadow-sm'
                : 'text-soren-subtle hover:text-soren-muted'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
