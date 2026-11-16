import { describe, expect, it } from 'vitest'

import de from '@/i18n/de'
import en from '@/i18n/en'
import { named } from '@/i18n/keys'
import { voice } from '@/i18n/voice'

// The glossary as pairs: the English name, and the German ones, each before its note; a thing has two German
// names where the glossary tells them apart by a note, as Suche the name and Suchen the command.
const glossary = voice
  .split('Glossary')[1]
  .split('\n')
  .filter((line) => line.includes(' — '))
  .map((line) => {
    const [english, german] = line.split(' — ')
    const names = german.split(';')[0].split(', ')
    const told = names.every((name) => name.includes(' ('))
    return [
      english.split(/ \(|,|;/)[0],
      (told ? names : names.slice(0, 1)).map((name) => name.split(' (')[0]),
    ] as const
  })

describe('the words of the interface', () => {
  it('name each thing of the glossary by the glossary, in both languages', () => {
    const known = new Map(glossary.map(([english, german]) => [english, german]))
    const shared = Object.entries(en).filter(([, word]) => known.has(word))

    expect(shared.length).toBeGreaterThan(2)
    for (const [key, word] of shared) expect(known.get(word)).toContain(de[key as keyof typeof de])
  })

  it('name keys by a symbol where they have one, the same on every device', () => {
    for (const language of ['en', 'de'] as const) {
      expect(named(language, ['shift', 'enter', 'up', 'down', 'left', 'right'])).toEqual({
        apple: '⇧↵↑↓←→',
        other: '⇧ ↵ ↑ ↓ ← →',
      })
      expect(named(language, ['esc'])).toBe('Esc')
    }
  })

  it('name the keys that command by the device, and Ctrl as German says it', () => {
    expect(named('en', ['mod', 'K'])).toEqual({ apple: '⌘K', other: 'Ctrl K' })
    expect(named('de', ['mod', 'K'])).toEqual({ apple: '⌘K', other: 'Strg K' })
    expect(named('en', ['alt'])).toEqual({ apple: '⌥', other: 'Alt' })
    expect(named('de', ['alt'])).toEqual({ apple: '⌥', other: 'Alt' })
  })
})
