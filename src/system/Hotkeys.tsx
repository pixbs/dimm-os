'use client'

import { useSetting } from '@/ds/atoms/useSetting'
import { Bar, BarText } from '@/ds/molecules/Bar'
import { Keys } from '@/ds/molecules/Key'
import { Row } from '@/ds/molecules/Row'
import { List } from '@/ds/organisms/List'
import { Section } from '@/ds/sections/Section'
import { type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'
import { named, systemKeys } from '@/i18n/keys'
import { type AppKey, type Command, single } from '@/shell/keys'
import type { Parts } from '@/shell/OnDesk'

type Props = {
  t: Dictionary
  language: Language
  // The name of the system, as its menu in the menu bar shows it.
  name: string
  apps: AppKey[]
  // The row a key or a press lit last: a command, or the path of an app.
  lit: string | null
  // A row that does what its key does, from the element pressed.
  run: (command: Command, opener: Element) => void
  light: (row: string) => void
}

// The commands of each group, in their order.
const opens = ['hotkeys', 'search', 'preferences'] as const
const windows = ['close', 'minimise', 'fullScreen', 'nextWindow'] as const

function Body({ t, language, name, apps, lit, run, light }: Props) {
  const off = useSetting('shortcuts') === 'off'
  const said: Record<Command, string> = {
    hotkeys: t.hotkeys,
    search: t.hotkeysSearch,
    preferences: t.preferences,
    close: t.hotkeysClose,
    minimise: t.hotkeysMinimise,
    fullScreen: t.hotkeysFull,
    nextWindow: t.nextWindow,
  }
  // A row shows each key apart, named for the device and the language; one that is a single key says when those are off.
  const row = (
    id: string,
    title: string,
    keys: readonly string[],
    acts: { href: string; lang?: string } | { onClick: (opener: Element) => void } | null,
  ) => {
    const faint = off && single(keys)
    return (
      <Row
        data-surface={lit === id ? 'inverted' : undefined}
        href={acts && 'href' in acts ? acts.href : undefined}
        key={id}
        lang={acts && 'lang' in acts ? acts.lang : undefined}
        onClick={
          acts
            ? (event) => {
                light(id)
                if ('onClick' in acts) acts.onClick(event.currentTarget)
              }
            : undefined
        }
        text={faint ? t.hotkeysOff : undefined}
        title={title}
        trail={<Keys names={keys.map((key) => named(language, [key]))} off={faint} />}
      />
    )
  }
  // A command that opens a window is a link to it, as its menu item is.
  const command = (one: Command) =>
    row(
      one,
      said[one],
      systemKeys[one],
      one === 'hotkeys' || one === 'preferences'
        ? { href: toAddress(language, `/${one}`) }
        : { onClick: (opener) => run(one, opener) },
    )

  return (
    <>
      <div data-for="desk">
        <Section>
          <List head={{ title: t.open, end: '' }} lines>
            {opens.map(command)}
            {apps.map((app) =>
              row(app.path, app.title, [app.key], {
                href: toAddress(language, app.path),
                lang: app.lang,
              }),
            )}
          </List>
          <List head={{ title: t.windows, end: '' }} lines>
            {windows.map(command)}
            {row('move', t.hotkeysMove, ['arrows'], null)}
            {row('resize', t.hotkeysResize, ['shift', 'arrows'], null)}
          </List>
        </Section>
      </div>
      <div data-for="phone">
        <Section>
          <div className="prose">
            <p>{t.gesturesSay}</p>
          </div>
          <List>
            {t.gestureRows.map(([title, text]) => (
              <Row key={title} text={text.replace('{name}', name)} title={title} />
            ))}
          </List>
        </Section>
      </div>
    </>
  )
}

// Hotkeys: every key of the map, each row doing what its key does and lit as its key is pressed; on a phone, which
// has no keys, the gestures.
export function hotkeysWindow(props: Props): Parts {
  return {
    body: <Body {...props} />,
    status: (
      <Bar data-for="desk" line="above" size="compact">
        <BarText>{props.t.hotkeysTyping}</BarText>
      </Bar>
    ),
  }
}
