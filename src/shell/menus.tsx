import { change } from '@/ds/atoms/settings'
import type { Item, Top } from '@/ds/organisms/Menu'
import { Travels } from '@/ds/motion/Travels'
import { type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'

import type { commandsOf, SystemCommand } from './commands'
import { type Action, compact, front, phone, showing, type Windows } from './manager'
import { tasksOf } from './OnDesk'
import { SystemScreen } from './System'

// The pitches the dot can be set to.
const pitches = ['5', '6', '8', '10', '12']

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

  return [
    { name: t.menu, icon: 'menu', for: 'desk touch', items: all },
    {
      name: props.name,
      label: props.name,
      lead: <Travels className="mark" data-surface="orange" id="mark" lands />,
      items: system,
      screen: phone(desk)
        ? (done) => (
            <SystemScreen
              done={done}
              here={showing(desk) ?? '/'}
              language={language}
              legal={props.legal}
              lock={() => commands.lock.run()}
              login={props.login}
              name={props.name}
              shutDown={() => commands.shutDown.run()}
              t={t}
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
