'use client'

import './motion.css'

import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'

const features = () => import('./features').then((module) => module.default)

// Strict: a full motion component under it throws, since it would bring all of Motion before first paint.
export function Motion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      {children}
    </LazyMotion>
  )
}
