import { describe, expect, it } from 'vitest'

import { visitor } from '@/data/fixture'
import { getWindowView } from '@/data/views'

describe('the view of a window', () => {
  it('is plain JSON, with rich text as HTML', async () => {
    const view = await getWindowView('/work/grow', 'en', null)

    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
    expect(view?.window?.sections).toEqual([
      { type: 'text', html: '<p>A fixture item that every guest may open.</p>' },
    ])
  })

  it('gives each window one path in each language', async () => {
    const en = await getWindowView('/work', 'en', null)
    const de = await getWindowView('/work', 'de', null)

    expect(en?.shortcuts).toEqual([{ href: '/work', title: 'Work' }])
    expect(de?.shortcuts).toEqual([{ href: '/de/work', title: 'Arbeit' }])
    expect(en?.window?.sections[1]).toEqual({
      type: 'list',
      items: [{ href: '/work/grow', title: 'Grow' }],
    })
    expect(de?.window?.sections[1]).toEqual({
      type: 'list',
      items: [{ href: '/de/work/grow', title: 'Grow' }],
    })
  })

  it.each(['en', 'de'] as const)(
    'leaves a hidden window out of all a guest sees, in %s',
    async (language) => {
      const list = await getWindowView('/work', language, null)
      const item = await getWindowView('/work/grow', language, null)

      expect(await getWindowView('/work/vault', language, null)).toBeNull()
      expect(list?.window?.sections[1]).toMatchObject({ items: [{ title: 'Grow' }] })
      expect(item?.window?.counters).toEqual({ position: 1, total: 1 })
      expect(item?.window?.neighbours).toEqual({ previous: null, next: null })
    },
  )

  it.each([
    ['en', '/work/vault', 'Vault'],
    ['de', '/de/work/vault', 'Tresor'],
  ] as const)('shows it to a visitor who may see it, in %s', async (language, href, title) => {
    const list = await getWindowView('/work', language, visitor)
    const item = await getWindowView('/work/grow', language, visitor)
    const hidden = await getWindowView('/work/vault', language, visitor)

    expect(list?.window?.sections[1]).toMatchObject({ items: [{ title: 'Grow' }, { href, title }] })
    expect(item?.window?.counters).toEqual({ position: 1, total: 2 })
    expect(item?.window?.neighbours).toEqual({ previous: null, next: { href, title } })
    expect(hidden?.window?.frame.title).toBe(title)
    expect(hidden?.window?.neighbours.previous?.title).toBe('Grow')
  })
})
