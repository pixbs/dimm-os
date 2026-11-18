import { describe, expect, it } from 'vitest'

import { chapters, numberOf, type Placed } from '@/shell/Sections'

const text = (title: string | null): Placed => ({
  type: 'text',
  title,
  text: null,
  split: false,
  join: false,
  html: '<p>Words</p>',
})

describe('the chapters of a window', () => {
  it('are its texts under a heading of their own, numbered in the order they stand in', () => {
    const [first, second, third] = [text('First'), text('Second'), text('Third')]
    const sections = [text(null), first, second, third]
    const numbered = (order: Placed[]) =>
      chapters(order).map((chapter, at) => [chapter.title, numberOf(at)])

    expect(numbered(sections)).toEqual([
      ['First', '01'],
      ['Second', '02'],
      ['Third', '03'],
    ])
    // Moved, a chapter takes the number of its new place, and the others follow.
    expect(numbered([third, first, second])).toEqual([
      ['Third', '01'],
      ['First', '02'],
      ['Second', '03'],
    ])
  })
})
