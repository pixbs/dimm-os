import { change } from '@/ds/atoms/settings'
import type { Item, Top } from '@/ds/organisms/Menu'
import { type Language, languages, names, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'

import type { commandsOf, SystemCommand } from './commands'
import { type Action, compact, front, phone, type Windows } from './manager'
import { tasksOf } from './OnDesk'

// The pitches the dot can be set to.
const pitches = ['5', '6', '8', '10', '12']

// The themes, the device's first; nothing changes until one is chosen.
export function themeMenu(t: Dictionary, chosen: string | null): Item[] {
  const themes = [
    [null, t.system],
    ['dark', t.dark],
    ['light', t.light],
  ] as const
  return themes.map(([theme, label]) => ({
    label,
    mark: true,
    checked: chosen === theme,
    act: () => change({ theme }),
  }))
}

// The languages by their own names: the other is a plain link to the same window, the one in force only closes.
export function languageMenu(language: Language, path: string): Item[] {
  return languages.map((one) => ({
    label: names[one],
    lang: one,
    mark: true,
    checked: one === language,
    href: one === language ? undefined : toAddress(one, path),
  }))
}

// The legal windows under the names they have, then consent; the row of its preferences opens a window that asks.
export function legalMenu(
  t: Dictionary,
  language: Language,
  found: { title: string; href?: string }[],
): Item[] {
  const link = (path: string, words: string) => {
    const href = toAddress(language, path)
    return { label: found.find((one) => one.href === href)?.title ?? words, href }
  }
  return [
    link('/imprint', t.imprint),
    link('/privacy-policy', t.privacy),
    'rule',
    link('/cookies', t.cookies),
    { label: `${t.cookiePreferences}…`, href: toAddress(language, '/cookies/preferences') },
  ]
}

// The menus of the menu bar hold only what the system does, so they hold whatever content exists. On a phone
// File, View, Window and Help stay behind the system menu, which ends with the three legal links.
export function menus(props: {
  t: Dictionary
  language: Language
  name: string
  desk: Windows
  act: (action: Action) => void
  search: () => void
  commands: ReturnType<typeof commandsOf>
  legal: Item[]
  theme: Item[]
  languages: Item[]
}): Top[] {
  const { t, language, desk, act, commands } = props
  const key = (command: keyof typeof systemKeys) => named(language, systemKeys[command])
  const link = (path: string, label: string, hint?: keyof typeof systemKeys) => ({
    label,
    href: toAddress(language, path),
    hint: hint && key(hint),
  })
  const top = front(desk)
  const shown = desk.open.find((entry) => entry.path === top)
  const oneSize = !!shown?.view?.frame.oneSize
  const onDesk = desk.open.filter((entry) => entry.mode !== 'min').length
  const about = link('/about', t.about.replace('{name}', props.name))
  const hotkeys = link('/hotkeys', phone(desk) ? t.gestures : t.hotkeys, 'hotkeys')
  const legal = [
    link('/imprint', t.imprint),
    link('/privacy-policy', t.privacy),
    link('/cookies', t.cookies),
  ]
  // A command of the system, dimmed where it cannot act on the window in front.
  const command = (name: SystemCommand) => ({
    label: t[name],
    act: () => commands[name].run(),
    disabled: !commands[name].can(),
  })
  // Placing a window needs a desk with room for it, and one that can change its size.
  const put = (label: string, where: 'left' | 'right' | 'fill' | 'centre') => ({
    label,
    act: () => act({ type: 'put', where }),
    disabled: !top || compact(desk) || (oneSize && where !== 'centre'),
  })

  const file: Item[] = [
    { label: t.searchCommand, hint: key('search'), act: props.search },
    {
      label: t.closeWindow,
      hint: key('close'),
      act: () => act({ type: 'close', path: top! }),
      disabled: !top,
    },
    'rule',
    command('copyLink'),
    command('openInTab'),
    command('download'),
  ]
  const view: Item[] = [
    {
      label: t.fullScreen,
      hint: key('fullScreen'),
      act: () => act({ type: 'full' }),
      disabled: !top || compact(desk) || oneSize,
    },
    { label: t.theme, items: props.theme },
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
    command('nextWallpaper'),
  ]
  const window: Item[] = [
    {
      label: t.minimise,
      hint: key('minimise'),
      act: () => act({ type: 'minimise' }),
      disabled: !desk.open.length,
    },
    command('minimiseAll'),
    {
      label: t.nextWindow,
      hint: key('nextWindow'),
      act: () => act({ type: 'next' }),
      disabled: onDesk < 2,
    },
    {
      label: t.moveResize,
      items: [
        put(t.leftHalf, 'left'),
        put(t.rightHalf, 'right'),
        put(t.fill, 'fill'),
        put(t.centre, 'centre'),
      ],
    },
    'rule',
    command('closeAll'),
    ...(desk.open.length ? ['rule' as const] : []),
    ...tasksOf(desk).map((task, at) => ({
      label: task.name,
      radio: true,
      checked: !!task.front,
      act: () => act({ type: 'open', path: desk.open[at].at }),
    })),
  ]
  const accessibility = link('/accessibility', t.accessibility)
  // Each row stands in one menu; the phone keeps its drawer as it was.
  const onPhone = phone(desk)
  const help: Item[] = [hotkeys, accessibility, ...(onPhone ? [about] : [])]
  const others = [
    { label: t.file, items: file },
    { label: t.view, items: view },
    { label: t.window, items: window },
    { label: t.help, items: help },
  ]
  const all = [...others, { label: t.legal, items: props.legal }]
  // On a phone the theme and the language stand here, each showing the choice in force at its end.
  const inForce = (items: Item[]) =>
    items.find((item) => item !== 'rule' && item.checked) as Exclude<Item, 'rule'> | undefined
  const appearance: Item[] = [
    { label: t.theme, meta: inForce(props.theme)?.label, items: props.theme },
    { label: t.prefsLanguage, meta: inForce(props.languages)?.label, items: props.languages },
    'rule',
  ]
  const system: Item[] = [
    ...(onPhone ? appearance : []),
    about,
    // It opens a window of settings, so it ends in an ellipsis; the phone keeps its row as it was.
    link('/preferences', onPhone ? t.preferences : `${t.preferences}…`, 'preferences'),
    ...(onPhone ? [accessibility, hotkeys] : []),
    'rule',
    command('lock'),
    command('shutDown'),
    ...(onPhone ? (['rule', ...others, 'rule', ...legal] as Item[]) : []),
  ]

  return [
    { name: t.menu, icon: 'menu', for: 'desk touch', items: all },
    {
      name: props.name,
      label: props.name,
      lead: <span className="mark" data-surface="orange" />,
      items: system,
    },
    ...all.map((menu) => ({
      name: menu.label,
      label: menu.label,
      for: 'desk pointer',
      items: menu.items,
    })),
  ]
}
