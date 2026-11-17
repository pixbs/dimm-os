import type { FactsBlock } from '@/payload-types'

import { framed } from '../framed'

export type FactsView = ReturnType<typeof framed> & {
  type: 'facts'
  surface: NonNullable<FactsBlock['surface']>
  items: { label: string; value: string }[]
}

export function facts(block: FactsBlock): FactsView {
  return {
    type: 'facts',
    ...framed(block),
    surface: block.surface ?? 'window',
    items: block.items.map(({ label, value }) => ({ label, value })),
  }
}
