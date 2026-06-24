import { useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core'

/**
 * Capteurs DnD partagés par tous les kanbans (pipeline, prospection, process, tâches…).
 * - Souris : drag dès 8px de déplacement (précis, desktop).
 * - Tactile : appui maintenu ~180ms avant de capturer → un swipe rapide scrolle,
 *   un appui long déplace la carte. Pas de conflit scroll/drag au doigt.
 */
export function useKanbanSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )
}
