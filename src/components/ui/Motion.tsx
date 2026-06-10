'use client'

import * as React from 'react'
import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from 'framer-motion'

/**
 * Centralized entrance-motion primitives for VividFlow.
 *
 * Goal: a single, coordinated, GENTLE cascade when a module mounts — instead of
 * the previous patchwork of inline `style={{ animation: 'fadeSlideUp ...' }}`
 * (durations up to 400ms with delays up to 480ms, uncoordinated).
 *
 * Rules respected:
 *  - animate ONLY transform (y) + opacity — never width/height/margin/top/left.
 *  - short, premium easing (easeOut cubic-bezier), ≤300ms per item.
 *  - prefers-reduced-motion → opacity-only, no translation, no stagger.
 *  - framer-motion manages `will-change` automatically during the animation,
 *    so text stays crisp (no permanent layer promotion).
 *
 * Usage — swap the markup IN PLACE, keeping every className intact:
 *
 *   <MotionStagger className="flex flex-col h-full">
 *     <MotionItem className="...">…</MotionItem>
 *     <MotionItem className="...">…</MotionItem>
 *   </MotionStagger>
 */

const EASE = [0.22, 1, 0.36, 1] as const

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
}

const reducedItemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: 'easeOut' } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25, ease: EASE } },
}

/** Container that orchestrates a soft top-down cascade of its <MotionItem> children. */
export function MotionStagger({ children, ...props }: HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={
        reduce
          ? { hidden: {}, show: { transition: { staggerChildren: 0 } } }
          : containerVariants
      }
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** A single block in the cascade. Renders a plain motion.div — no extra wrapper. */
export const MotionItem = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  function MotionItem({ children, style, ...props }, ref) {
    const reduce = useReducedMotion()
    return (
      <motion.div
        ref={ref}
        variants={reduce ? reducedItemVariants : itemVariants}
        style={{ backfaceVisibility: 'hidden', ...style }}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/** Layout section in a MotionStagger cascade — opacity-only, no y-translation. */
export const MotionSection = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  function MotionSection({ children, style, ...props }, ref) {
    const reduce = useReducedMotion()
    return (
      <motion.div
        ref={ref}
        variants={reduce ? reducedItemVariants : sectionVariants}
        style={{ backfaceVisibility: 'hidden', ...style }}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/**
 * Opacity-ONLY reveal — for skeleton → real-content crossfades. No translation,
 * so nothing shifts when the data lands (the skeleton already reserved the space).
 */
export const MotionReveal = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  function MotionReveal({ children, style, ...props }, ref) {
    const reduce = useReducedMotion()
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0.12 : 0.2, ease: 'easeOut' }}
        style={{ backfaceVisibility: 'hidden', ...style }}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

export interface MotionFadeProps extends HTMLMotionProps<'div'> {
  /** Cascade delay in SECONDS (e.g. 0.06). Ignored under reduced-motion. */
  delay?: number
}

/**
 * Self-contained entrance for a single block — fade + soft rise on mount, with an
 * optional cascade `delay`. Drop-in replacement for the old
 * `style={{ animation: 'fadeSlideUp ...' }}`: same DOM element, just framer-driven,
 * shorter, and reduced-motion aware. No parent <MotionStagger> required.
 */
export const MotionFade = React.forwardRef<HTMLDivElement, MotionFadeProps>(
  function MotionFade({ children, delay = 0, style, ...props }, ref) {
    const reduce = useReducedMotion()
    return (
      <motion.div
        ref={ref}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.16 : 0.28, ease: EASE, delay: reduce ? 0 : delay }}
        style={{ backfaceVisibility: 'hidden', ...style }}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
