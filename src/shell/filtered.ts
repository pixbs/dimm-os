import type { ListView } from '@/blocks/list/view'
import type { Dictionary } from '@/i18n/en'

// A choice of the filter: the window the items relate to, by its address and its title.
export type Chosen = { href: string; label: string }

// A list as a filter leaves it: the items that relate to the window chosen, each keeping its place in the whole list,
// as many as its limit allows, how many of how many that is, and a line where none is left.
export function filtered(
  list: ListView,
  chosen: Chosen | null,
  t: Pick<Dictionary, 'share' | 'nothingIn'>,
  // Numbers are written as the page's language writes them.
  language = 'en',
) {
  const kept = list.items
    .map((item, place) => ({ ...item, place }))
    .filter(({ tags }) => !chosen || tags.includes(chosen.href))
  const items = list.limit ? kept.slice(0, list.limit) : kept
  return {
    ...list,
    items,
    matching: kept.length,
    count:
      items.length < kept.length
        ? t.share
            .replace('{on}', items.length.toLocaleString(language))
            .replace('{of}', kept.length.toLocaleString(language))
        : null,
    empty: kept.length ? null : chosen ? t.nothingIn.replace('{filter}', chosen.label) : list.empty,
  }
}
