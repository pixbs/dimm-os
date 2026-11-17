import type { IconName } from '@/ds/atoms/Icon'
import type { Language } from '@/i18n/address'

// One thing search finds: a window this viewer may see, or an app of the system, under the label of its group.
export type Found = {
  title: string
  kind: string
  group: string
  // What else it answers to: an item, its window's title.
  words: string
  icon: IconName
  href: string
  lang?: Language
}

// What was typed, and the row in force.
export type Typed = { q: string; sel: number }

type Press = Pick<KeyboardEvent, 'key' | 'code' | 'altKey'> &
  Partial<Pick<KeyboardEvent, 'ctrlKey' | 'isComposing'>>

const lower = (text: string) => text.toLocaleLowerCase()

// Groups keep their order; inside one, a match in the title comes before a match only in the kind or the words.
export function found(index: Found[], q: string): Found[] {
  const typed = lower(q.trim())
  if (!typed) return index
  const groups = index.map((one) => one.group)
  const rank = (one: Found) =>
    groups.indexOf(one.group) * 2 + (lower(one.title).includes(typed) ? 0 : 1)
  return index
    .filter((one) => lower(`${one.title} ${one.kind} ${one.words}`).includes(typed))
    .sort((a, b) => rank(a) - rank(b))
}

// A title as the letters before what was typed, the letters that match it, and those after.
export function marked(title: string, q: string): [string, string, string] {
  const typed = q.trim()
  const at = typed ? lower(title).indexOf(lower(typed)) : -1
  if (at < 0) return [title, '', '']
  return [title.slice(0, at), title.slice(at, at + typed.length), title.slice(at + typed.length)]
}

// What a key does in the field: the arrows move, Enter opens the row in force and Alt with a number the row of that
// number; Esc clears what was typed and, with nothing typed, closes. Any other key is the field's.
export function pressed(
  typed: Typed,
  count: number,
  press: Press,
): { typed: Typed } | { open: number } | { close: true } | null {
  // A word being composed takes its own keys, and AltGr, which is Ctrl with Alt, types a character.
  if (press.isComposing) return null
  const digit = /^Digit([1-9])$/.exec(press.code)
  // A number past the last row opens nothing, and types nothing either.
  if (press.altKey && !press.ctrlKey && digit)
    return Number(digit[1]) <= count ? { open: Number(digit[1]) - 1 } : { typed }
  if (press.key === 'ArrowDown' || press.key === 'ArrowUp') {
    const sel = typed.sel + (press.key === 'ArrowDown' ? 1 : -1)
    return { typed: { ...typed, sel: Math.max(0, Math.min(count - 1, sel)) } }
  }
  if (press.key === 'Enter') return count ? { open: Math.min(typed.sel, count - 1) } : null
  if (press.key === 'Escape') return typed.q ? { typed: { q: '', sel: 0 } } : { close: true }
  return null
}
