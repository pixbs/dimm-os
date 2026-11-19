import type { IconName } from '@/ds/atoms/Icon'
import type { Language } from '@/i18n/address'
import type { Media } from '@/payload-types'

import type { Action } from './header/view'

// A picture as a list or a card shows it, cropped at its focal point; its words carry their language where it is not
// the page's.
export type Shown = {
  src: string
  alt: string
  lang?: Language
  position: string
  live: NonNullable<Media['live']> | null
}

// A file as a picture of the page: null where this viewer may not read it, or it has no file.
export type Show = (file: number | Media | null | undefined) => Shown | null

// An item of a window as a list or a set of cards shows it, from its Listing fields: in the language it is written
// in, with the windows it relates to that this viewer may see.
export type Listed = {
  href: string
  lang?: Language
  name: string
  caption: string | null
  title: string
  note: string | null
  text: string | null
  picture: Shown | null
  facts: { label: string; value: string }[]
  related: Action[]
  icon: IconName | null
}

// The items of a window this viewer may see, and every window they relate to, in the order of the windows; null where
// the window itself is not seen.
export type Listing = (window: unknown) => { items: Listed[]; related: Action[] } | null
