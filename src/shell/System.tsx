'use client'

import type { IconName } from '@/ds/atoms/Icon'
import { Tile } from '@/ds/molecules/App'
import { Avatar } from '@/ds/molecules/Media'
import { Row } from '@/ds/molecules/Row'
import { Groups, List } from '@/ds/organisms/List'
import type { Screen } from '@/ds/organisms/Menu'
import { type Language, toAddress } from '@/i18n/address'
import type { Dictionary } from '@/i18n/en'

type Tone = Parameters<typeof Tile>[0]['tile']

// The Dimm OS screen of a phone, in the pattern of a phone's settings: the visitor, then groups of rows, each led by
// the tile of an app. A row that leads to a window ends with the arrow and puts the drawer away as it opens it; Theme
// and Language open their choices, the menu's first two submenus, in front.
export function SystemScreen(props: {
  t: Dictionary
  language: Language
  name: string
  visitor: string | null
  // The theme and the language in force.
  inForce: (string | undefined)[]
  legal: { label: string; href: string }[]
  login: () => void
  lock: () => void
  shutDown: () => void
  menus: Screen
}) {
  const { t, language, menus } = props
  const { done } = menus
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
          {[
            { tile: 'paper' as const, icon: 'contrast' as const, title: t.theme },
            { tile: 'blue' as const, icon: 'globe' as const, title: t.prefsLanguage },
          ].map((row, at) => (
            <Row
              aria-expanded={menus.expanded(at)}
              aria-haspopup="menu"
              key={at}
              lead={<Tile icon={row.icon} tile={row.tile} />}
              meta={props.inForce[at]}
              onClick={(event) => menus.open(at, event.currentTarget)}
              title={row.title}
            />
          ))}
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
