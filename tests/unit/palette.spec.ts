import { describe, expect, it } from 'vitest'

import { type Found, found, marked, pressed } from '@/shell/palette'

// An index as the views build it: the items under their window's title, then the windows, then the system.
const row = (group: string, title: string, kind: string, words = ''): Found => ({
  group,
  title,
  kind,
  words,
  icon: 'window',
  href: `/${title.toLowerCase().replaceAll(' ', '-')}`,
})
const index = [
  row('Work', 'A first question', 'Case study', 'Work'),
  row('Work', 'A second question', 'Case study', 'Work'),
  row('Work', 'A product question', 'Case study', 'Work'),
  row('Work', 'A question about prototypes', 'Process', 'Work'),
  row('Services', 'Product research', 'Service', 'Services'),
  row('Services', 'Product design', 'Service', 'Services'),
  row('Services', 'Design systems', 'Service', 'Services'),
  row('Windows', 'Welcome', 'Window'),
  row('Windows', 'Work', 'Window'),
  row('Windows', 'Services', 'Window'),
  row('System', 'Hotkeys', 'System'),
  row('System', 'Preferences', 'System'),
]
const titles = (list: Found[]) => list.map((one) => one.title)
const key = (key: string, code = '', altKey = false) => ({ key, code, altKey })

describe('the palette', () => {
  it('lists everything, grouped, before anything is typed', () => {
    expect(found(index, '')).toEqual(index)
    expect(found(index, '   ')).toEqual(index)
  })

  it('narrows as the visitor types, whatever the case, and keeps the order of the groups', () => {
    expect(titles(found(index, 'PRO'))).toEqual([
      'A product question',
      'A question about prototypes',
      'Product research',
      'Product design',
    ])
  })

  it('finds a row by its kind and by the title of its window', () => {
    expect(titles(found(index, 'service'))).toEqual([
      'Product research',
      'Product design',
      'Design systems',
      'Services',
    ])
    expect(titles(found(index, 'case stud'))).toEqual(titles(index.slice(0, 3)))
  })

  it('puts a match in the title before a match only in the words, inside a group', () => {
    expect(titles(found(index, 'work'))).toEqual([
      'A first question',
      'A second question',
      'A product question',
      'A question about prototypes',
      'Work',
    ])
    const titled = [row('Work', 'Not here', 'Case study', 'pro'), row('Work', 'Pro', 'Case study')]
    expect(titles(found(titled, 'pro'))).toEqual(['Pro', 'Not here'])
  })

  it('marks the typed letters where the title holds them', () => {
    expect(marked('A product question', 'PRO')).toEqual(['A ', 'pro', 'duct question'])
    expect(marked('Design systems', 'service')).toEqual(['Design systems', '', ''])
  })

  it('finds nothing where nothing matches', () => {
    expect(found(index, 'zzz')).toEqual([])
  })

  it('moves the selection with the arrows, never past either end', () => {
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('ArrowDown'))).toEqual({
      typed: { q: 'pro', sel: 1 },
    })
    expect(pressed({ q: 'pro', sel: 3 }, 4, key('ArrowDown'))).toEqual({
      typed: { q: 'pro', sel: 3 },
    })
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('ArrowUp'))).toEqual({
      typed: { q: 'pro', sel: 0 },
    })
  })

  it('opens the selected row with Enter, and the row of a number with Alt', () => {
    expect(pressed({ q: 'pro', sel: 1 }, 4, key('Enter'))).toEqual({ open: 1 })
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('¡', 'Digit3', true))).toEqual({ open: 2 })
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('Enter'))).toEqual({ open: 0 })
    expect(pressed({ q: 'zzz', sel: 0 }, 0, key('Enter'))).toBeNull()
    // Past the last row a number opens nothing.
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('5', 'Digit5', true))).toEqual({
      typed: { q: 'pro', sel: 0 },
    })
  })

  it('clears with Esc first, then closes', () => {
    expect(pressed({ q: 'pro', sel: 2 }, 4, key('Escape'))).toEqual({ typed: { q: '', sel: 0 } })
    expect(pressed({ q: '', sel: 0 }, index.length, key('Escape'))).toEqual({ close: true })
  })

  it('leaves any other key to the field', () => {
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('a', 'KeyA'))).toBeNull()
    expect(pressed({ q: 'pro', sel: 0 }, 4, key('3', 'Digit3'))).toBeNull()
  })

  it('leaves AltGr and a word being composed to the field', () => {
    const altGr = { ...key('{', 'Digit7', true), ctrlKey: true }
    expect(pressed({ q: 'pro', sel: 0 }, 9, altGr)).toBeNull()
    expect(pressed({ q: 'pro', sel: 0 }, 4, { ...key('Enter'), isComposing: true })).toBeNull()
  })
})
