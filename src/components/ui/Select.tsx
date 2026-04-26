'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  className?: string
  size?: 'sm' | 'md'
}

export default function Select({ value, onChange, options, className = '', size = 'md' }: SelectProps) {
  const [open, setOpen]       = useState(false)
  const [pos,  setPos]        = useState({ top: 0, left: 0, width: 0 })
  const btnRef      = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isSm   = size === 'sm'
  const current = options.find(o => o.value === value)

  // Calcule la position sous le bouton
  const calcPos = useCallback(() => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }, [])

  const handleOpen = () => {
    calcPos()
    setOpen(v => !v)
  }

  // Ferme sur clic extérieur
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (btnRef.current     && btnRef.current.contains(e.target as Node))     return
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Ferme sur scroll ou resize
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

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-1.5 bg-[#f9f9f7] border border-[#f0f0eb] rounded-lg text-[#111] font-medium transition-colors hover:border-[#d1d5db] focus:outline-none focus:border-[#3462EE] ${
          isSm ? 'px-2 py-1 text-[12px]' : 'px-3 py-2 text-[13px]'
        } ${open ? 'border-[#3462EE]' : ''}`}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown
          size={isSm ? 11 : 13}
          className={`flex-shrink-0 text-soren-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="bg-soren-card border border-soren-border rounded-xl shadow-xl overflow-hidden"
          style={{
            position: 'absolute',
            top:      pos.top,
            left:     pos.left,
            minWidth: Math.max(pos.width, 90),
            zIndex:   9999,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-soren-elevated ${
                opt.value === value ? 'text-[#111] font-semibold' : 'text-[#374151]'
              }`}
            >
              {opt.label}
              {opt.value === value && <Check size={11} className="text-[#3462EE] flex-shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
