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
  '/preferences': { w: 1040, h: 1024 },
  '/hotkeys': { w: 400, h: 760 },
}
