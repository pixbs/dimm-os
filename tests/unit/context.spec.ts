import { describe, expect, it } from 'vitest'

import type { WindowView } from '@/data/views'
import en from '@/i18n/en'
import { commandsOf } from '@/shell/commands'
import { menuOf, type Place } from '@/shell/context'
import { type Action, manager, start, type Windows } from '@/shell/manager'

const view = (path: string, oneSize = false): WindowView => ({
  path,
  frame: { title: path, kind: null, tile: null, oneSize },
  sections: [],
  actions: [],
  count: 0,
  kind: null,
  parent: null,
  counters: null,
  neighbours: { previous: null, next: null },
})

const measured = (window: WindowView | null, ...actions: Action[]) =>
  [{ type: 'desk', w: 1440, h: 820 } as Action, ...actions].reduce(manager, start(window))

const subject = { querySelector: () => null, textContent: 'Work' } as unknown as HTMLElement
const noop = () => {}

// The rows of a menu by their labels, a rule as a dash and a submenu with its rows.
function rows(place: Place, desk: Windows) {
  const commands = commandsOf({
    desk,
    language: 'en',
    act: noop,
    lock: noop,
    replay: noop,
    shutDown: noop,
    copied: noop,
    cleanUp: noop,
  })
  const menu = menuOf(place, {
    t: en,
    language: 'en',
    desk,
    act: noop,
    commands,
    subject,
    site: 'Berlin',
    clock: null,
    open: noop,
    copy: noop,
  })
  return menu?.items.map((item) =>
    item === 'rule'
      ? '-'
      : Array.isArray(item.items)
        ? [item.label, item.items.map((one) => (one === 'rule' ? '-' : one.label))]
        : item.label,
  )
}

describe('a right-click menu', () => {
  it('on the desk offers what belongs to the desk, and only what can apply', () => {
    const none = measured(null)
    expect(rows({ kind: 'desk' }, none)).toEqual(['Next wallpaper', 'Preferences…', 'Clean up'])
    const open = measured(view('/work'))
    expect(rows({ kind: 'desk' }, open)).toEqual([
      'Next wallpaper',
      'Preferences…',
      'Clean up',
      '-',
      'Minimise all windows',
      'Close all windows',
    ])
    const away = manager(open, { type: 'minimise', path: '/work' })
    expect(rows({ kind: 'desk' }, away)).toEqual([
      'Next wallpaper',
      'Preferences…',
      'Clean up',
      '-',
      'Close all windows',
    ])
  })

  it('on apps selected together opens them all, and copies their links', () => {
    const hrefs = ['/en/work', '/en/lab', '/en/cv']
    expect(rows({ kind: 'apps', hrefs }, measured(null))).toEqual(['Open 3', '-', 'Copy links'])
  })

  it('on an app opens it and shares it, and a file downloads too', () => {
    const desk = measured(null)
    const href = 'https://example.org/work'
    expect(rows({ kind: 'app', href }, desk)).toEqual(['Open', '-', 'Copy link'])
    expect(rows({ kind: 'app', href, file: 'https://example.org/cv.pdf' }, desk)).toEqual([
      'Open',
      'Download',
      '-',
      'Copy link',
    ])
    expect(rows({ kind: 'item', href }, desk)).toEqual([
      'Open',
      'Open in new tab',
      '-',
      'Copy link',
    ])
  })

  it('on a title bar acts on its window, and leaves out what the window does not allow', () => {
    const desk = measured(view('/work'))
    const places = ['Left half', 'Right half', 'Fill', 'Centre']
    expect(rows({ kind: 'window', path: '/work' }, desk)).toEqual([
      'Minimise',
      'Full screen',
      ['Move & Resize', places],
      '-',
      'Copy link',
      '-',
      'Close',
    ])
    const full = manager(desk, { type: 'full', path: '/work' })
    expect(rows({ kind: 'window', path: '/work' }, full)?.[1]).toBe('Exit full screen')
    const fixed = measured(view('/about', true))
    expect(rows({ kind: 'window', path: '/about' }, fixed)).toEqual([
      'Minimise',
      ['Move & Resize', ['Centre']],
      '-',
      'Copy link',
      '-',
      'Close',
    ])
  })

  it('on a taskbar button shows a window put away, and says nothing of one gone', () => {
    const desk = measured(view('/work'))
    expect(rows({ kind: 'task', path: '/work' }, desk)).toEqual([
      'Minimise',
      'Full screen',
      '-',
      'Close',
    ])
    const away = manager(desk, { type: 'minimise', path: '/work' })
    expect(rows({ kind: 'task', path: '/work' }, away)).toEqual([
      'Show',
      'Full screen',
      '-',
      'Close',
    ])
    expect(rows({ kind: 'task', path: '/lab' }, desk)).toBeUndefined()
  })

  it('on the clock marks the place in force', () => {
    const menu = menuOf(
      { kind: 'clock' },
      {
        t: en,
        language: 'en',
        desk: measured(null),
        act: noop,
        commands: {} as ReturnType<typeof commandsOf>,
        subject,
        site: 'Berlin',
        clock: 'yours',
        open: noop,
        copy: noop,
      },
    )
    expect(menu?.items).toMatchObject([
      { label: 'Berlin', checked: false },
      { label: 'Yours', checked: true },
    ])
  })
})
