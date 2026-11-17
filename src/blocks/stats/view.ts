import type { StatsBlock } from '@/payload-types'

import { framed } from '../framed'

export type StatsView = ReturnType<typeof framed> & {
  type: 'stats'
  surface: NonNullable<StatsBlock['surface']>
  items: { value: string; label: string }[]
}

export function stats(block: StatsBlock): StatsView {
  return {
    type: 'stats',
    ...framed(block),
    surface: block.surface ?? 'window',
    items: block.items.map(({ value, label }) => ({ value, label })),
  }
}
