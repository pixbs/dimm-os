import { systemKeys } from '@/i18n/keys'

import { type Action, compact, phone, type Windows } from './manager'

type Command = keyof typeof systemKeys

// The letter of an app, which opens its window.
export type AppKey = { key: string; path: string }

type Press = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'> &
  Partial<Pick<KeyboardEvent, 'isComposing' | 'defaultPrevented'>> & {
    target: EventTarget | null
  }

// A key that types a character, which speech input can press by saying a word.
const single = (keys: readonly string[]) => keys.length === 1 && keys[0].length === 1

const typing = (target: EventTarget | null) =>
  !!(target as Element | null)?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
  )

// What a command does on the desk; search has no action of the window manager.
function act(command: Command, desk: Windows): Action | 'search' | null {
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

// The one key map: the keys of the system and the letters of the apps. Nothing acts while the visitor types in a
// field, with Alt, or with a key the browser owns; with single keys off, only ⌘K or Ctrl K and Esc do.
export function keyAction(
  press: Press,
  apps: AppKey[],
  singleKeys: boolean,
  desk: Windows,
): Action | 'search' | null {
  if (press.defaultPrevented || press.isComposing || press.altKey || typing(press.target))
    return null

  const name = press.key === 'Escape' ? 'esc' : press.key
  const combo = [...(press.metaKey || press.ctrlKey ? ['mod'] : []), name].join(' ').toUpperCase()
  const is = (keys: readonly string[]) =>
    (singleKeys || !single(keys)) && keys.join(' ').toUpperCase() === combo

  const command = (Object.keys(systemKeys) as Command[]).find((one) => is(systemKeys[one]))
  if (command) return act(command, desk)
  const app = apps.find((one) => is([one.key]))
  return app ? { type: 'open', path: app.path } : null
}
