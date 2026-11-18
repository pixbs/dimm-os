import { systemKeys } from '@/i18n/keys'

import { type Action, compact, phone, type Windows } from './manager'

export type Command = keyof typeof systemKeys

// The letter of an app, which opens its window, and the window's title, in the language it is in.
export type AppKey = { key: string; path: string; title: string; lang?: string }

type Press = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'> &
  Partial<Pick<KeyboardEvent, 'isComposing' | 'defaultPrevented'>> & {
    target: EventTarget | null
  }

// A key that types a character, which speech input can press by saying a word.
export const single = (keys: readonly string[]) => keys.length === 1 && keys[0].length === 1

// A field types the keys, and a menu or a modal dialog takes them for itself over what lies behind it.
const held = (target: EventTarget | null) =>
  !!(target as Element | null)?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role=menu], dialog',
  )

// What a command does on the desk; search has no action of the window manager.
export function commandAction(command: Command, desk: Windows): Action | 'search' | null {
  switch (command) {
    case 'hotkeys':
      return { type: 'open', path: '/hotkeys' }
    case 'preferences':
      return { type: 'open', path: '/preferences' }
    case 'search':
      return 'search'
    // On a phone Esc puts the drawer away, as its handle does.
    case 'close':
      return { type: phone(desk) ? 'minimise' : 'escape' }
    case 'minimise':
      return { type: 'minimise' }
    case 'fullScreen':
      return compact(desk) ? null : { type: 'full' }
    case 'nextWindow':
      return { type: 'next' }
  }
}

// The one key map: the keys of the system and the letters of the apps. Nothing is pressed while the visitor types in a
// field, with Alt, or with a key the browser owns; with single keys off, only ⌘K or Ctrl K and Esc are.
export function pressed(
  press: Press,
  apps: AppKey[],
  singleKeys: boolean,
): Command | AppKey | null {
  if (press.defaultPrevented || press.isComposing || press.altKey || held(press.target)) return null

  const name = press.key === 'Escape' ? 'esc' : press.key
  const combo = [...(press.metaKey || press.ctrlKey ? ['mod'] : []), name].join(' ').toUpperCase()
  const is = (keys: readonly string[]) =>
    (singleKeys || !single(keys)) && keys.join(' ').toUpperCase() === combo

  const command = (Object.keys(systemKeys) as Command[]).find((one) => is(systemKeys[one]))
  return command ?? apps.find((one) => is([one.key])) ?? null
}

// What a press does on the desk.
export function keyAction(
  press: Press,
  apps: AppKey[],
  singleKeys: boolean,
  desk: Windows,
): Action | 'search' | null {
  const key = pressed(press, apps, singleKeys)
  if (!key) return null
  return typeof key === 'string' ? commandAction(key, desk) : { type: 'open', path: key.path }
}
