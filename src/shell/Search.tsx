'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'

import { Palette } from '@/ds/organisms/Palette'
import type { Language } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named } from '@/i18n/keys'

import { type Found, found, marked, pressed, type Typed } from './palette'

const empty: Typed = { q: '', sel: 0 }

// The palette over the desk: what this viewer may find, narrowed as they type. A row is a plain link, which the desk
// follows as any other, so its window grows out of the row.
export function Search(props: {
  open: boolean
  opener: Element | null
  onClose: () => void
  index: Found[]
  drawer: boolean
  name: string
  language: Language
  t: Dictionary
}) {
  const { t, language } = props
  const [typed, setTyped] = useState(empty)
  // A row that was chosen hands the focus on to its window, so the palette gives none back.
  const [chosen, setChosen] = useState(false)
  const [was, setWas] = useState(props.open)
  if (was !== props.open) {
    setWas(props.open)
    if (props.open) {
      setTyped(empty)
      setChosen(false)
    }
  }

  const list = found(props.index, typed.q)
  const sel = Math.min(typed.sel, Math.max(0, list.length - 1))
  const key = (...keys: string[]) => named(language, keys)
  const counted = (
    new Intl.PluralRules(language).select(list.length) === 'one' ? t.result : t.results
  ).replace('{count}', String(list.length))

  function choose() {
    flushSync(() => setChosen(true))
    props.onClose()
  }

  return (
    <Palette
      drawer={props.drawer}
      escape={key('esc')}
      field={t.searchField.replace('{name}', props.name)}
      keys={[
        [[key('up'), key('down')], t.move],
        [[key('enter')], t.open],
        [[key('alt'), '1'], t.byNumber],
        [[key('esc')], t.close],
      ]}
      none={t.nothingMatches.replace('{q}', typed.q.trim())}
      onChoose={(event) => {
        if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) choose()
      }}
      onClear={() => setTyped(empty)}
      onClose={props.onClose}
      // The window could not take the focus while the palette was modal: once it has gone, it does.
      onGone={() => {
        if (chosen && document.activeElement === document.body)
          document.querySelector<HTMLElement>('article[data-front]')?.focus()
      }}
      onKey={(event) => {
        const does = pressed({ ...typed, sel }, list.length, event.nativeEvent)
        if (!does) return
        event.preventDefault()
        if ('typed' in does) setTyped(does.typed)
        else if ('close' in does) props.onClose()
        else {
          // A key opens a row as a press on it does.
          const rows = event.currentTarget
            .closest('.dialog__frame')!
            .querySelectorAll('[role=option]')
          ;(rows[does.open] as HTMLElement).click()
        }
      }}
      onType={(event) => setTyped({ q: event.target.value, sel: 0 })}
      open={props.open}
      opener={chosen ? null : props.opener}
      results={list.map((one, at) => ({
        href: one.href,
        lang: one.lang,
        icon: one.icon,
        title: marked(one.title, typed.q),
        kind: one.kind,
        group: one.group,
        keys: at === sel ? [key('enter')] : at < 9 ? [key('alt'), String(at + 1)] : [],
      }))}
      said={counted}
      selected={sel}
      t={t}
      value={typed.q}
    />
  )
}
