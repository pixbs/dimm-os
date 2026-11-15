import type { Language } from './address'

// The keys that have a symbol are drawn as it on every device.
const symbols = { shift: '⇧', enter: '↵', up: '↑', down: '↓', left: '←', right: '→', esc: 'Esc' }

// The name of each key, per language and device: mod is the key that commands, ⌘ on an Apple device.
export const keyNames = {
  en: {
    apple: { mod: '⌘', alt: '⌥', ...symbols },
    other: { mod: 'Ctrl', alt: 'Alt', ...symbols },
  },
  de: {
    apple: { mod: '⌘', alt: '⌥', ...symbols },
    other: { mod: 'Strg', alt: 'Alt', ...symbols },
  },
} satisfies Record<Language, Record<Device, Record<string, string>>>

type Device = 'apple' | 'other'

export type Key = keyof typeof keyNames.en.apple

// One name where the devices agree, else one for each: the page holds both and shows the device's.
export type Named = string | Record<Device, string>

// What keys pressed together are called: written together on an Apple device, apart elsewhere.
export function named(language: Language, keys: (Key | (string & {}))[]): Named {
  const [apple, other] = (['apple', 'other'] as const).map((device) =>
    keys
      .map((key) => keyNames[language][device][key as Key] ?? key)
      .join(device === 'apple' ? '' : ' '),
  )
  return apple === other ? apple : { apple, other }
}
