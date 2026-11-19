import type { Language } from '@/i18n/address'

type Words = Record<Language, string>

// What a purpose keeps on the device, as what, and for how long.
type Kept = { name: Words; kind?: Words; kept: Words }

// What needs a yes: the purpose, the company behind it, where its data is stored, and what it keeps on the device. Its
// words stand here, beside the entry, in both languages.
export type Entry = {
  id: string
  title: Words
  purpose: Words
  service: string
  company: string
  country: Words
  stored: Words
  keeps: Kept[]
}

export const registry: Entry[] = [
  {
    id: 'analytics',
    title: { en: 'Analytics', de: 'Statistik' },
    purpose: {
      en: 'Counts visits and clicks, so I can see which work people actually read. Nothing is sold or used for ads.',
      de: 'Zählt Besuche und Klicks, damit ich sehe, welche Arbeiten wirklich gelesen werden. Nichts wird verkauft oder für Werbung genutzt.',
    },
    service: 'PostHog',
    company: 'PostHog, Inc.',
    country: { en: 'USA', de: 'USA' },
    stored: { en: 'Frankfurt', de: 'Frankfurt' },
    keeps: [
      {
        name: { en: 'ph_*', de: 'ph_*' },
        kind: { en: 'cookie', de: 'Cookie' },
        kept: { en: '1 year', de: '1 Jahr' },
      },
      {
        name: { en: 'ph_*', de: 'ph_*' },
        kind: { en: 'session storage', de: 'Sitzungsspeicher' },
        kept: { en: 'Until the tab closes', de: 'Bis der Tab geschlossen wird' },
      },
    ],
  },
]

// What the site keeps on the device without asking, because it needs it to work.
export const necessary: Kept[] = [
  {
    name: {
      en: 'The consent choice: the choice, its version and its date, no identifier',
      de: 'Die Einwilligung: die Wahl, ihre Version und ihr Datum, keine Kennung',
    },
    kept: { en: '6 months', de: '6 Monate' },
  },
  {
    name: { en: 'Settings', de: 'Einstellungen' },
    kept: { en: 'Until you reset them', de: 'Bis Sie sie zurücksetzen' },
  },
  {
    name: { en: '“Remember windows”', de: '„Fenster merken“' },
    kept: { en: 'Off until switched on', de: 'Aus, bis Sie es einschalten' },
  },
  {
    name: { en: 'Open windows; “the intro has played”', de: 'Offene Fenster; „das Intro lief“' },
    kept: { en: 'Until the tab closes', de: 'Bis der Tab geschlossen wird' },
  },
  {
    name: { en: 'A visitor’s sign-in cookie', de: 'Das Anmelde-Cookie eines Gasts' },
    kept: { en: 'Until the invitation ends', de: 'Bis die Einladung endet' },
  },
]

// The version of the consent is the registry itself: any change to an entry is a new version, which asks again.
export const version = (() => {
  let hash = 5381
  for (const char of JSON.stringify(registry)) hash = (hash * 33) ^ char.charCodeAt(0)
  return (hash >>> 0).toString(36)
})()
