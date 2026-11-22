'use client'

import type { IconName } from '@/ds/atoms/Icon'
import { change } from '@/ds/atoms/settings'
import { useSetting } from '@/ds/atoms/useSetting'
import { Tile } from '@/ds/molecules/App'
import { Avatar } from '@/ds/molecules/Media'
import { Row } from '@/ds/molecules/Row'
import { Groups, List } from '@/ds/organisms/List'
import { type Language, languages, names, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

type Tone = Parameters<typeof Tile>[0]['tile']

// The Dimm OS screen of a phone, in the pattern of a phone's settings: the visitor, then groups of rows, each led by
// the tile of an app. A row that leads to a window ends with the arrow and puts the drawer away as it opens it.
export function SystemScreen(props: {
  t: Dictionary
  language: Language
  name: string
  visitor: string | null
  // The address of the window in front, which the other language opens too.
  here: string
  legal: { label: string; href: string }[]
  login: () => void
  lock: () => void
  shutDown: () => void
  done: () => void
}) {
  const { t, language, done } = props
  const theme = useSetting('theme')
  const other = languages.find((one) => one !== language)!
  const link = (tile: Tone, icon: IconName, title: string, href: string) => (
    <Row
      end="arrow-right"
      href={href}
      key={href}
      lead={<Tile icon={icon} tile={tile} />}
      onClick={done}
      title={title}
    />
  )
  const act = (icon: IconName, title: string, run: () => void) => (
    <Row
      lead={<Tile icon={icon} tile="raised" />}
      onClick={() => {
        done()
        run()
      }}
      title={title}
    />
  )
  const window = (tile: Tone, icon: IconName, title: string, path: string) =>
    link(tile, icon, title, toAddress(language, path))
  const [imprint, privacy, cookies, preferences] = props.legal
  const name = props.visitor ?? t.guest

  return (
    <div className="dialog__body">
      <Groups>
        <List>
          <Row
            end="arrow-right"
            lead={
              <Avatar size="compact" surface="raised">
                {name[0]}
              </Avatar>
            }
            onClick={() => {
              done()
              props.login()
            }}
            text={props.visitor ? undefined : t.logIn}
            title={name}
          />
        </List>
        <List head={{ title: t.appearance, end: '' }}>
          {/* Until the choices open as a menu, a press goes to the next one. */}
          <Row
            lead={<Tile icon="contrast" tile="paper" />}
            meta={theme && (theme === 'light' ? t.light : t.dark)}
            onClick={() => change({ theme: theme === 'light' ? 'dark' : 'light' })}
            title={t.theme}
          />
          <Row
            href={toAddress(other, props.here)}
            lead={<Tile icon="globe" tile="blue" />}
            meta={names[language]}
            title={t.prefsLanguage}
          />
        </List>
        <List head={{ title: t.system, end: '' }}>
          {window('orange', 'info', t.about.replace('{name}', props.name), '/about')}
          {window('raised', 'sliders', t.preferences, '/preferences')}
          {window('blue', 'accessibility', t.accessibility, '/accessibility')}
          {window('mint', 'hand', t.gestures, '/hotkeys')}
        </List>
        <List head={{ title: t.legal, end: '' }}>
          {link('paper', 'file', imprint.label, imprint.href)}
          {link('mint', 'shield', privacy.label, privacy.href)}
          {link('orange', 'cookie', cookies.label, cookies.href)}
          {link('raised', 'check', preferences.label, preferences.href)}
        </List>
        <List>
          {act('lock', t.lock, props.lock)}
          {act('power', t.shutDown, props.shutDown)}
        </List>
      </Groups>
    </div>
  )
}
