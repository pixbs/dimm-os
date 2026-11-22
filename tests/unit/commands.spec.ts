import { describe, expect, it } from 'vitest'

import { addressOf } from '@/shell/commands'
import { start } from '@/shell/manager'

const desk = start({
  path: '/work/grow',
  frame: { title: 'Grow', kind: null, tile: null },
  sections: [],
  actions: [],
  count: 0,
  kind: null,
  parent: null,
  counters: null,
  neighbours: { previous: null, next: null },
})

describe('copy link', () => {
  it('gives the address of what the window shows, with its language', () => {
    expect(addressOf(desk, 'en', 'https://example.org', '/work')).toBe(
      'https://example.org/work/grow',
    )
    expect(addressOf(desk, 'de', 'https://example.org', '/work')).toBe(
      'https://example.org/de/work/grow',
    )
    expect(addressOf(desk, 'en', 'https://example.org', '/about')).toBeUndefined()
  })
})
