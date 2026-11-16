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
