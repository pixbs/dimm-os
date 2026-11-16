import { change } from '@/ds/atoms/settings'
import type { Item, Top } from '@/ds/organisms/Menu'
import { type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'

import { type Action, compact, front, phone, type Windows } from './manager'
import { tasksOf } from './OnDesk'

// The pitches the dot can be set to.
const pitches = ['5', '6', '8', '10', '12']

// The menus of the menu bar hold only what the system does, so they hold whatever content exists. On a phone
// File, View, Window and Help stay behind the system menu, which ends with the three legal links.
export function menus(props: {
  t: Dictionary
  language: Language
  name: string
  desk: Windows
  act: (action: Action) => void
}): Top[] {
  const { t, language, desk, act } = props
  const key = (...keys: Parameters<typeof named>[1]) => named(language, keys)
  const link = (path: string, label: string, hint?: string) => ({
    label,
    href: toAddress(language, path),
    hint: hint && key(hint),
  })
  const top = front(desk)
  const shown = desk.open.find((entry) => entry.path === top)
  const oneSize = !!shown?.view?.frame.oneSize
  const onDesk = desk.open.filter((entry) => entry.mode !== 'min').length
  const about = link('/about', t.about.replace('{name}', props.name))
  const hotkeys = link('/hotkeys', phone(desk) ? t.gestures : t.hotkeys, '?')
  const legal = [
    link('/imprint', t.imprint),
    link('/privacy-policy', t.privacy),
    link('/cookies', t.cookies),
  ]
  // Placing a window needs a desk with room for it, and one that can change its size.
  const put = (label: string, where: 'left' | 'right' | 'fill' | 'centre') => ({
    label,
    act: () => act({ type: 'put', where }),
    disabled: !top || compact(desk) || (oneSize && where !== 'centre'),
  })

  const file: Item[] = [
    // Search arrives with the palette.
    { label: t.searchCommand, hint: key('mod', 'K'), disabled: true },
    {
      label: t.closeWindow,
      hint: key('esc'),
      act: () => act({ type: 'close', path: top! }),
      disabled: !top,
    },
  ]
  const view: Item[] = [
    {
      label: t.fullScreen,
      hint: key('F'),
      act: () => act({ type: 'full' }),
      disabled: !top || compact(desk) || oneSize,
    },
    {
      label: t.theme,
      act: () =>
        change({ theme: document.documentElement.dataset.theme === 'light' ? 'dark' : 'light' }),
    },
    {
      label: t.dot,
      items: () =>
        pitches.map((pitch) => ({
          label: pitch,
          radio: true,
          checked: document.documentElement.dataset.pitch === pitch,
          act: () => change({ pitch }),
        })),
    },
  ]
  const window: Item[] = [
    {
      label: t.minimise,
      hint: key('M'),
      act: () => act({ type: 'minimise' }),
      disabled: !desk.open.length,
    },
    { label: t.nextWindow, hint: key('N'), act: () => act({ type: 'next' }), disabled: onDesk < 2 },
    {
      label: t.moveResize,
      items: [
        put(t.leftHalf, 'left'),
        put(t.rightHalf, 'right'),
        put(t.fill, 'fill'),
        put(t.centre, 'centre'),
      ],
    },
    ...(desk.open.length ? ['rule' as const] : []),
    ...tasksOf(desk).map((task, at) => ({
      label: task.name,
      radio: true,
      checked: !!task.front,
      act: () => act({ type: 'open', path: desk.open[at].path }),
    })),
  ]
  const help: Item[] = [hotkeys, link('/accessibility', t.accessibility), about, ...legal]
  const others = [
    { label: t.file, items: file },
    { label: t.view, items: view },
    { label: t.window, items: window },
    { label: t.help, items: help },
  ]
  const system: Item[] = [
    about,
    link('/preferences', t.preferences, ','),
    link('/accessibility', t.accessibility),
    hotkeys,
    'rule',
    // The screens that wait arrive with the boot.
    { label: t.lock, disabled: true },
    { label: t.shutDown, disabled: true },
    ...(phone(desk) ? (['rule', ...others, 'rule', ...legal] as Item[]) : []),
  ]

  return [
    { name: t.menu, icon: 'menu', for: 'desk touch', items: others },
    {
      name: props.name,
      label: props.name,
      lead: <span className="mark" data-surface="orange" />,
      items: system,
    },
    ...others.map((menu) => ({
      name: menu.label,
      label: menu.label,
      for: 'desk pointer',
      items: menu.items,
    })),
  ]
}
