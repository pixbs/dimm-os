import { change } from '@/ds/atoms/settings'
import type { Item } from '@/ds/organisms/Menu'
import type { Shortcut } from '@/ds/organisms/Screen'
import { fromAddress, type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

import type { commandsOf } from './commands'
import { type Action, compact, type Windows } from './manager'
import { idOf } from './OnDesk'

// The places a right click opens a menu at, each about one thing: a window by its path, an app or an item by its
// address.
export type Place =
  | { kind: 'desk' | 'clock' }
  | { kind: 'app'; href: string; file?: string }
  | { kind: 'window' | 'task'; path: string }
  | { kind: 'item'; href: string }

type Row = Exclude<Item, 'rule'>

// What lies under the pointer, or has the focus, when it has a menu of its own: everything else keeps the browser's,
// text, a link in text, a picture, a field, a menu, the other buttons.
export function placeOf(
  target: Element,
  desk: Windows,
  apps: Shortcut[],
  language: Language,
): { place: Place; subject: HTMLElement } | null {
  const at = (selector: string) => target.closest<HTMLElement>(selector)
  const windowOf = (element: Element | null | undefined, prefix = '') =>
    desk.open.find((one) => element && `${prefix}${idOf(one.path)}` === element.id)?.path

  const clock = at('.bar__text:has(> time)')
  if (clock) return { place: { kind: 'clock' }, subject: clock }
  const task = at('[id^="task-window"]')
  const tasked = windowOf(task, 'task-')
  if (task && tasked) return { place: { kind: 'task', path: tasked }, subject: task }
  const bar = at('.window__bar')
  const barred = windowOf(bar?.closest('article'))
  if (bar && barred) return { place: { kind: 'window', path: barred }, subject: bar }
  const app = at('.apps > a.app') as HTMLAnchorElement | null
  if (app) {
    const file = apps.find((one) => one.href === app.getAttribute('href'))?.file
    const href = file && new URL(file, location.origin).href
    return { place: { kind: 'app', href: app.href, file: href }, subject: app }
  }
  // An item opens a window of this site, in its language.
  const item = at('a:is(.row, .card):not([role^=menuitem], [download])') as HTMLAnchorElement | null
  const shows = item?.origin === location.origin && fromAddress(item.pathname)
  if (item && shows && shows.language === language && shows.path !== '/') {
    return { place: { kind: 'item', href: item.href }, subject: item }
  }
  const ground = target.matches('.screen__desk, .screen__desk > .apps') && at('.screen__desk')
  return ground ? { place: { kind: 'desk' }, subject: ground } : null
}

// A menu about one thing: what a plain press on it does first, then what changes its state, what shares it, and after
// a rule what ends it, three groups at most; a row that cannot apply now is left out. Each row is a command the menu
// bar, search or a key also runs.
export function menuOf(
  place: Place,
  props: {
    t: Dictionary
    language: Language
    desk: Windows
    act: (action: Action) => void
    commands: ReturnType<typeof commandsOf>
    subject: HTMLElement
    site: string
    clock: string | null
  },
): { label: string; items: Item[] } | null {
  const { t, desk, act, commands, subject } = props
  const groups = (...all: (Row | false | undefined)[][]) =>
    all
      .map((group) => group.filter((row): row is Row => !!row))
      .filter((group) => group.length)
      .flatMap((group, at): Item[] => (at ? ['rule', ...group] : group))
  const command = (name: keyof ReturnType<typeof commandsOf>, of?: string) =>
    commands[name].can(of) && { label: t[name], act: () => commands[name].run(of) }
  const press = { label: t.open, act: () => subject.click() }
  const named =
    subject.querySelector('.row__title, .hgroup__title')?.textContent ?? subject.textContent

  switch (place.kind) {
    case 'desk':
      return {
        label: t.desk,
        items: groups(
          [
            command('nextWallpaper'),
            { label: `${t.preferences}…`, href: toAddress(props.language, '/preferences') },
            command('cleanUp'),
          ],
          [command('minimiseAll'), command('closeAll')],
        ),
      }
    case 'app':
      return {
        label: named,
        items: groups(
          [press, !!place.file && command('download', place.file)],
          [command('copyLink', place.href)],
        ),
      }
    case 'item':
      return {
        label: named,
        items: groups([press, command('openInTab', place.href)], [command('copyLink', place.href)]),
      }
    case 'clock':
      return {
        label: t.prefsClock,
        items: [
          [props.site, null],
          [t.prefsYours, 'yours'],
        ].map(([label, clock]) => ({
          label: label!,
          mark: true,
          checked: (props.clock === 'yours' ? 'yours' : null) === clock,
          act: () => change({ clock }),
        })),
      }
  }

  const { path } = place
  // A window gone since has nothing to say.
  const entry = desk.open.find((one) => one.path === path)
  if (!entry) return null
  const oneSize = !!entry.view?.frame.oneSize
  const away = entry.mode === 'min'
  const full = entry.mode === 'full' || (away && entry.was === 'full')
  const show = () => act({ type: 'task', path, opener: subject })
  // A desk with room has full screen and places; a window of one size can only be centred.
  const room = !compact(desk) && !oneSize
  const toggle = room && {
    label: full ? t.exitFullScreen : t.fullScreen,
    act: () => {
      if (away) show()
      act({ type: 'full', path })
    },
  }
  const put = (label: string, where: 'left' | 'right' | 'fill' | 'centre') =>
    (room || where === 'centre') && { label, act: () => act({ type: 'put', where, path }) }
  const close = { label: t.close, act: () => act({ type: 'close', path }) }
  const minimise = { label: t.minimise, act: () => act({ type: 'minimise', path }) }
  const label = entry.view?.frame.title ?? path

  if (place.kind === 'task') {
    return {
      label,
      items: groups([away ? { label: t.show, act: show } : minimise, toggle], [close]),
    }
  }
  const places = groups([
    put(t.leftHalf, 'left'),
    put(t.rightHalf, 'right'),
    put(t.fill, 'fill'),
    put(t.centre, 'centre'),
  ])
  return {
    label,
    items: groups(
      [minimise, toggle, !compact(desk) && entry.placed && { label: t.moveResize, items: places }],
      [command('copyLink', path)],
      [close],
    ),
  }
}
