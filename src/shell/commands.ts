import type { FootButton } from '@/data/views'
import { change } from '@/ds/atoms/settings'
import { following } from '@/ds/organisms/wallpapers'
import { type Language, toAddress } from '@/i18n/address'
import type { systemCommands } from '@/system/windows'

import { type Action, front, type Windows } from './manager'

export type SystemCommand = keyof typeof systemCommands

type Command = { run: (subject?: string) => void; can: (subject?: string) => boolean }

// The file a window offers at its foot or on its record, as the button there downloads it.
function fileOf(desk: Windows, path?: string): FootButton | undefined {
  const view = desk.open.find((one) => one.path === path)?.view
  const aside = view?.aside?.type === 'record' ? view.aside.actions : []
  return [...(view?.actions ?? []), ...aside].find((button) => button.to === 'media')
}

// The address of what a window shows, in the language of the desk.
export function addressOf(desk: Windows, language: Language, origin: string, path?: string) {
  const at = desk.open.find((one) => one.path === path)?.at
  return at ? new URL(toAddress(language, at), origin).href : undefined
}

// The commands of the system, which the menu bar, search and the keys read alike: each acts on its subject, the window
// in front unless another is named, and says whether it can, so a menu dims it and search leaves it out.
export function commandsOf(props: {
  desk: Windows
  language: Language
  act: (action: Action) => void
  lock: () => void
  replay: () => void
  shutDown: () => void
  copied: () => void
}): Record<SystemCommand, Command> {
  const { desk, language, act } = props
  const always = () => true
  const address = (subject = front(desk)) => addressOf(desk, language, location.origin, subject)
  // Read while the server renders, which has no address of its own.
  const linked = (subject = front(desk)) => desk.open.some((one) => one.path === subject)

  return {
    lock: { run: props.lock, can: always },
    replay: { run: props.replay, can: always },
    shutDown: { run: props.shutDown, can: always },
    nextWallpaper: {
      run: () => change({ wallpaper: following(document.documentElement.dataset.wallpaper) }),
      can: always,
    },
    minimiseAll: {
      run: () => act({ type: 'minimiseAll' }),
      can: () => desk.open.some((one) => one.mode !== 'min'),
    },
    closeAll: { run: () => act({ type: 'closeAll' }), can: () => desk.open.length > 0 },
    copyLink: {
      run: (subject) => {
        const href = address(subject)
        if (href) void navigator.clipboard.writeText(href).then(props.copied, () => {})
      },
      can: linked,
    },
    openInTab: {
      run: (subject) => {
        const href = address(subject)
        if (href) window.open(href, '_blank', 'noopener')
      },
      can: linked,
    },
    download: {
      run: (subject = front(desk)) => {
        const file = fileOf(desk, subject)
        if (!file) return
        const anchor = document.createElement('a')
        anchor.href = file.href
        anchor.download = ''
        anchor.click()
      },
      can: (subject = front(desk)) => !!fileOf(desk, subject),
    },
  }
}
