import { change } from '@/ds/atoms/settings'
import type { Item, Top } from '@/ds/organisms/Menu'
import { Travels } from '@/ds/motion/Travels'
import { type Language, languages, names, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'

import type { commandsOf, SystemCommand } from './commands'
import { type Action, compact, front, phone, type Windows } from './manager'
import { tasksOf } from './OnDesk'
import { SystemScreen } from './System'

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

// The legal windows under the names they have, then consent.
export function legalLinks(
  t: Dictionary,
  language: Language,
  found: { title: string; href?: string }[],
) {
  const link = (path: string, words: string) => {
    const href = toAddress(language, path)
    return { label: found.find((one) => one.href === href)?.title ?? words, href }
  }
  return [
    link('/imprint', t.imprint),
    link('/privacy-policy', t.privacy),
    link('/cookies', t.cookies),
    { label: t.cookiePreferences, href: toAddress(language, '/cookies/preferences') },
  ]
}

// The legal links as a menu; the row of the preferences opens a window that asks.
export function legalMenu(links: ReturnType<typeof legalLinks>): Item[] {
  const [imprint, privacy, cookies, preferences] = links
  return [imprint, privacy, 'rule', cookies, { ...preferences, label: `${preferences.label}…` }]
}

// The menus of the menu bar hold only what the system does, so they hold whatever content exists. On a phone the
// system menu is the Dimm OS screen.
export function menus(props: {
  t: Dictionary
  language: Language
  name: string
  desk: Windows
  act: (action: Action) => void
  search: () => void
  commands: ReturnType<typeof commandsOf>
  legal: ReturnType<typeof legalLinks>
  visitor: string | null
  login: () => void
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
    command('cleanUp'),
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
  // Each row stands in one menu.
  const all = [
    { label: t.file, items: file },
    { label: t.view, items: view },
    { label: t.window, items: window },
    { label: t.help, items: [hotkeys, accessibility] },
    { label: t.legal, items: legalMenu(props.legal) },
  ]
  const system: Item[] = [
    about,
    // It opens a window of settings, so it ends in an ellipsis.
    link('/preferences', `${t.preferences}…`, 'preferences'),
    'rule',
    command('lock'),
    command('shutDown'),
  ]
  // On a phone the menu is the Dimm OS screen, whose rows of the theme and the language open these; each shows the
  // choice in force at its end.
  const inForce = (items: Item[]) =>
    items.find((item) => item !== 'rule' && item.checked) as Exclude<Item, 'rule'> | undefined
  const choices: Item[] = [
    { label: t.theme, items: props.theme },
    { label: t.prefsLanguage, items: props.languages },
  ]

  return [
    { name: t.menu, icon: 'menu', for: 'desk touch', items: all },
    {
      name: props.name,
      label: props.name,
      lead: <Travels className="mark" data-surface="orange" id="mark" lands />,
      items: phone(desk) ? choices : system,
      screen: phone(desk)
        ? (menus) => (
            <SystemScreen
              language={language}
              legal={props.legal}
              lock={() => commands.lock.run()}
              login={props.login}
              menus={menus}
              name={props.name}
              shutDown={() => commands.shutDown.run()}
              t={t}
              inForce={[inForce(props.theme)?.label, inForce(props.languages)?.label]}
              visitor={props.visitor}
            />
          )
        : undefined,
    },
    ...all.map((menu) => ({
      name: menu.label,
      label: menu.label,
      for: 'desk pointer',
      items: menu.items,
    })),
  ]
}
