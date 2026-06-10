'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: 'left' | 'right'
  /** Kept for backward compatibility with existing call sites. */
  size?: 'sm' | 'md'
}

export default function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  align = 'left',
  size = 'md',
}: SelectProps) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 })
  const [active, setActive] = useState(-1)
  const btnRef      = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const current = options.find(o => o.value === value)
  void size

  const calcPos = useCallback(() => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    // Hauteur estimée du menu (item ≈ 32px + padding), plafonnée à max-h-64 (256px).
    const estH = Math.min(options.length * 32 + 8, 256)
    const spaceBelow = window.innerHeight - r.bottom
    // Flip vers le haut si pas la place en bas mais qu'il y en a au-dessus.
    const openUp = spaceBelow < estH + 12 && r.top > spaceBelow
    setPos({
      top:   openUp ? (r.top + window.scrollY - estH - 6) : (r.bottom + window.scrollY + 6),
      left:  r.left + window.scrollX,
      width: r.width,
    })
  }, [options.length])

  const handleOpen = () => {
    if (disabled) return
    calcPos()
    setActive(options.findIndex(o => o.value === value))
    setOpen(v => !v)
  }

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    btnRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleOpen()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && active < options.length) select(options[active].value)
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        onKeyDown={onKeyDown}
        className={`w-full bg-soren-elevated border border-transparent rounded-lg px-2.5 py-1.5 text-[13px] text-soren-text flex items-center justify-between gap-2 transition-all focus:outline-none focus:border-[#FF4D00]/40 focus:ring-2 focus:ring-[#FF4D00]/10 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${current ? '' : 'text-soren-subtle'}`}>
          {current?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-soren-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="bg-soren-card border border-soren-border rounded-xl shadow-xl overflow-hidden p-1 max-h-64 overflow-y-auto"
          style={{
            position: 'absolute',
            top:    pos.top,
            left:   align === 'right' ? undefined : pos.left,
            right:  align === 'right' ? Math.max(0, window.innerWidth - (pos.left + pos.width)) : undefined,
            minWidth: pos.width,
            maxWidth: 280,
            zIndex: 9999,
            animation: 'sorenSelectIn 120ms ease-out',
          }}
        >
          <style>{`@keyframes sorenSelectIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {options.map((opt, i) => {
            const selected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[13px] flex items-center justify-between gap-2 transition-colors ${
                  selected
                    ? 'bg-[#FF4D00]/10 text-[#FF4D00] font-medium'
                    : active === i
                      ? 'bg-soren-elevated text-soren-text'
                      : 'text-soren-text hover:bg-soren-elevated'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <Check size={14} className="flex-shrink-0" />}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
