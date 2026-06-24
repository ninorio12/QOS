'use client'

import { useEffect } from 'react'
import { Portal } from './Portal'

/**
 * Modale standard VividFlow. Garantit, partout et par défaut :
 *  - sortie via Portal (au-dessus du header z-40 et de la sidebar z-50, jamais piégée par un transform)
 *  - overlay plein écran en z-[100] + backdrop assombri cliquable (ferme)
 *  - fermeture au clavier (Échap)
 *  - scroll du body verrouillé tant que la modale est ouverte
 *
 * `children` = le panneau de la modale (positionné au centre). Exemple :
 *   {open && (
 *     <Modal onClose={() => setOpen(false)}>
 *       <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-lg …">…</div>
 *     </Modal>
 *   )}
 */
export function Modal({
  onClose, children, className, align = 'center',
}: {
  onClose: () => void
  children: React.ReactNode
  className?: string
  align?: 'center' | 'top'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <Portal>
      <div className={`fixed inset-0 z-[100] flex justify-center p-4 ${align === 'top' ? 'items-start pt-20' : 'items-center'} ${className ?? ''}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        {children}
      </div>
    </Portal>
  )
}
