'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'

type Notif = {
  id: string
  agent: 'Soren' | 'Kai' | 'Mia' | 'Système'
  message: string
  time: string
  read: boolean
  color: string
}

const STATIC_NOTIFS: Notif[] = [
  { id: 'n1', agent: 'Kai',    message: 'Lead Martin Dupont qualifié → stage mis à jour',   time: '10:44', read: false, color: '#4A91A8' },
  { id: 'n2', agent: 'Soren',  message: 'Analyse pipeline terminée — 12 opportunités, €74,6k',       time: '10:39', read: false, color: '#3462EE' },
  { id: 'n3', agent: 'Mia',    message: 'Devis Thomas Bernard — BN Bâtiment €8 900 généré',          time: '10:44', read: false, color: '#65a30d' },
  { id: 'n4', agent: 'Kai',    message: 'Intervention requise — Xavier Lambert sans réponse 48h',     time: '10:41', read: false, color: '#4A91A8' },
  { id: 'n5', agent: 'Système',message: 'Heartbeat Soren exécuté — 12 leads analysés',               time: '10:45', read: true,  color: '#9CA3AF' },
]

const LIVE_NOTIF_TEMPLATES: Omit<Notif, 'id' | 'time' | 'read'>[] = [
  { agent: 'Soren',   message: 'Digest quotidien Telegram envoyé — 3 leads qualifiés ce matin',      color: '#3462EE' },
  { agent: 'Kai',     message: 'SMS de bienvenue envoyé à Sophie Renard en 38 secondes',             color: '#4A91A8' },
  { agent: 'Mia',     message: 'Base de connaissance synchronisée — 3 nouvelles fiches BTP',         color: '#65a30d' },
  { agent: 'Soren',   message: 'Pipeline analysé — Xavier Lambert identifié prioritaire',            color: '#3462EE' },
  { agent: 'Kai',     message: 'Lead qualifié — score 84/100, stage PROPOSITION mis à jour',         color: '#4A91A8' },
  { agent: 'Mia',     message: 'Devis BN Bâtiment généré — €8 900 TTC, envoi planifié 09h00',       color: '#65a30d' },
  { agent: 'Soren',   message: 'Directive envoyée à Kai : relancer Romain Garcia (J+7)',             color: '#3462EE' },
  { agent: 'Système', message: 'OpenClaw Gateway · heartbeat 3 sessions actives',                    color: '#9CA3AF' },
  { agent: 'Kai',     message: 'RDV confirmé — Inès Duprez, 7 avril 14h · Calendrier mis à jour', color: '#4A91A8' },
  { agent: 'Mia',     message: 'Alerte devis — Marie Colin sans réponse > 7 jours',                  color: '#65a30d' },
]

let notifId = 100

export default function NotificationBell() {
  const [open, setOpen]     = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>(STATIC_NOTIFS)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  // Live notifications every 25–55s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function schedule() {
      const delay = 25000 + Math.random() * 30000
      timeout = setTimeout(() => {
        const tpl = LIVE_NOTIF_TEMPLATES[Math.floor(Math.random() * LIVE_NOTIF_TEMPLATES.length)]
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        notifId++
        setNotifs(prev => [{
          ...tpl,
          id: `live-${notifId}`,
          time,
          read: false,
        }, ...prev].slice(0, 15))
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(o => !o)
          setNotifs(prev => prev.map(n => ({ ...n, read: true })))
        }}
        className="w-8 h-8 rounded-full bg-[#E4E6E1] flex items-center justify-center hover:bg-[#D8DAD5] transition-colors relative"
      >
        <Bell size={14} className="text-[#6B7280]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#3462EE] flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[360px] bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#111111]">Notifications</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#3462EE] text-white">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] font-bold text-[#22c55e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                LIVE
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-[#F5F5F0] max-h-[380px] overflow-y-auto">
            {notifs.map(n => (
              <button
                key={n.id}
                onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F9F9F7] transition-colors ${
                  n.read ? 'opacity-50' : ''
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: n.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold" style={{ color: n.color }}>{n.agent}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{n.time}</span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-[#374151] leading-4">{n.message}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#E5E7EB]">
            <a href="/logs" className="text-xs text-[#3462EE] hover:text-[#2a50d4] font-medium transition-colors">
              Voir toutes les activités →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
