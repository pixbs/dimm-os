'use client'

import { lazy, Suspense } from 'react'

// Each picture the system draws itself, fetched only when one shows.
const pictures = {
  'not-found': lazy(() => import('../motion/Numerals')),
  portrait: lazy(() => import('../motion/Portrait')),
  postmark: lazy(() => import('./Postmark').then(({ Postmark }) => ({ default: Postmark }))),
}

export type LiveName = keyof typeof pictures

// A live picture by the name its media document gives it; until it is drawn the upload stands as its still.
export function Live({ name }: { name: LiveName }) {
  const Picture = pictures[name]
  return (
    <Suspense>
      <Picture />
    </Suspense>
  )
}
