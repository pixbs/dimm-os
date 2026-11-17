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

// The system windows of one size, and that size on a desk.
export const oneSize: Partial<Record<keyof typeof systemWindows, { w: number; h: number }>> = {
  '/preferences': { w: 1040, h: 976 },
}
