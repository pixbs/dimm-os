import { describe, expect, it } from 'vitest'

import type { ListView } from '@/blocks/list/view'
import en from '@/i18n/en'
import de from '@/i18n/de'
import { filtered } from '@/shell/filtered'

// An item of a window that relates to the windows given by their addresses.
const item = (key: string, tags: string[], kind: string | null = 'case') =>
  ({ key, tags, title: key, preview: null, kind }) as unknown as ListView['items'][number]

const list = (limit: number | null = null) =>
  ({
    items: [item('/a', ['/one']), item('/b', ['/one', '/two']), item('/c', ['/two'], 'pdf')],
    filter: [
      { href: '/one', label: 'One', count: 2 },
      { href: '/two', label: 'Two', count: 2 },
    ],
    limit,
    empty: null,
  }) as unknown as ListView

describe('a list of the items of a window', () => {
  it('keeps the items related to the window chosen, each in its place in the whole list', () => {
    const shown = filtered(list(), { href: '/two', label: 'Two' }, en)
    expect(shown.items.map(({ key, place }) => [key, place])).toEqual([
      ['/b', 1],
      ['/c', 2],
    ])
    expect(shown).toMatchObject({ matching: 2, count: null, empty: null })
  })

  it('shows no more than its limit, and counts how many of how many in either language', () => {
    expect(filtered(list(2), null, en)).toMatchObject({ matching: 3, count: '2 of 3' })
    expect(filtered(list(2), null, de).count).toBe('2 von 3')
    expect(filtered(list(2), { href: '/one', label: 'One' }, en).count).toBeNull()
  })

  it('says in one line when a filter leaves nothing', () => {
    const chosen = { href: '/gone', label: 'Gone' }
    expect(filtered(list(), chosen, en)).toMatchObject({ items: [], empty: 'Nothing in Gone.' })
    expect(filtered(list(), chosen, de).empty).toBe('Nichts in Gone.')
  })

  it('names the kind the items it leaves share, and none where they are mixed', () => {
    expect(filtered(list(), { href: '/one', label: 'One' }, en).kind).toBe('case')
    expect(filtered(list(), { href: '/two', label: 'Two' }, en).kind).toBeNull()
    expect(filtered(list(), null, en).kind).toBeNull()
  })
})
