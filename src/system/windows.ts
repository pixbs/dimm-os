import type { IconName } from '@/ds/atoms/Icon'
import type { Dictionary } from '@/i18n/en'

// The windows of the system stand at fixed paths, and go by the names the interface gives them.
export const systemWindows = {
  '/preferences': 'preferences',
  '/hotkeys': 'hotkeys',
  '/about': 'about',
  '/accessibility': 'accessibility',
  '/cookies': 'cookies',
  '/cookies/preferences': 'cookiePreferences',
} as const satisfies Record<string, keyof Dictionary>

// The mark of each, as search shows it.
export const systemIcons = {
  '/preferences': 'sliders',
  '/hotkeys': 'keyboard',
  '/about': 'info',
  '/accessibility': 'sun',
  '/cookies': 'lock',
  '/cookies/preferences': 'check',
} satisfies Record<keyof typeof systemWindows, IconName>

// The system windows of one size, and that size on a desk.
export const oneSize: Partial<Record<keyof typeof systemWindows, { w: number; h: number }>> = {
  '/preferences': { w: 1040, h: 869 },
  '/about': { w: 940, h: 690 },
  '/hotkeys': { w: 400, h: 760 },
  '/cookies': { w: 440, h: 670 },
}

// The system windows that can be resized, and their size on a desk, which is a maximum.
export const sized: Partial<Record<keyof typeof systemWindows, { w: number; h: number }>> = {
  '/accessibility': { w: 1100, h: 927 },
  '/cookies/preferences': { w: 840, h: 736 },
}

// The system windows drawn as paper records.
export const paper: (keyof typeof systemWindows)[] = ['/cookies', '/cookies/preferences']

// The commands of the system that search finds beside its windows, and the mark of each.
export const systemCommands = {
  lock: 'user',
  replay: 'play',
  shutDown: 'power',
  nextWallpaper: 'image',
  cleanUp: 'grid',
  minimiseAll: 'minus',
  closeAll: 'close',
  copyLink: 'link',
  openInTab: 'arrow-up-right',
  download: 'download',
} as const satisfies Partial<Record<keyof Dictionary, IconName>>
