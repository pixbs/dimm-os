import type { Language } from '@/i18n/address'
import type { HeaderBlock } from '@/payload-types'

// A button where it goes and what it says, in the language its words are in where that is not the page's.
export type Action = { href: string; label: string; lang?: Language; download?: boolean }

export type Button = NonNullable<HeaderBlock['actions']>[number]

export type HeaderView = {
  type: 'header'
  level: HeaderBlock['level']
  surface: HeaderBlock['surface']
  title: string
  text: string | null
  actions: Action[]
}

// A button to something this viewer may not see is absent.
export function header(block: HeaderBlock, action: (button: Button) => Action | null): HeaderView {
  return {
    type: 'header',
    level: block.level,
    surface: block.surface,
    title: block.title,
    text: block.text || null,
    actions: (block.actions ?? []).flatMap((button) => action(button) ?? []),
  }
}
